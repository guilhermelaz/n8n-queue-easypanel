document.addEventListener('DOMContentLoaded', function() {
    const workerCountInput = document.getElementById('workerCount');
    const workerCountValue = document.getElementById('workerCountValue');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const outputSection = document.getElementById('outputSection');
    const jsonOutput = document.getElementById('jsonOutput');

    workerCountInput.addEventListener('input', function() {
        workerCountValue.textContent = this.value;
    });

    generateBtn.addEventListener('click', generateTemplate);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadJSON);

    function generateTemplate() {
        const projectName = document.getElementById('projectName').value.trim();
        const domain = document.getElementById('domain').value.trim();
        const webhookDomain = document.getElementById('webhookDomain').value.trim();
        const n8nVersion = document.getElementById('n8nVersion').value.trim();
        const timezone = document.getElementById('timezone').value.trim();
        const encryptionKey = document.getElementById('encryptionKey').value.trim();
        const workerCount = parseInt(document.getElementById('workerCount').value);
        const includePythonRunner = document.getElementById('includePythonRunner').checked;
        const dbPassword = document.getElementById('dbPassword').value.trim();
        const redisPassword = document.getElementById('redisPassword').value.trim();

        if (!projectName || !domain || !webhookDomain || !n8nVersion || !timezone || !encryptionKey || !dbPassword || !redisPassword) {
            alert('Por favor, preencha todos os campos obrigatórios!');
            return;
        }

        const template = {
            services: []
        };

        template.services.push({
            type: "postgres",
            data: {
                serviceName: "postgres",
                password: dbPassword,
                image: "postgres:16-alpine",
                database: "n8n",
                env: `POSTGRES_DB=n8n`
            }
        });

        template.services.push({
            type: "redis",
            data: {
                projectName: projectName,
                serviceName: "redis",
                password: redisPassword,
                image: "redis:7-alpine"
            }
        });

        // Variáveis base compartilhadas entre main, workers e webhook
        const baseEnv = [
            `DB_TYPE=postgresdb`,
            `DB_POSTGRESDB_HOST=$(PROJECT_NAME)_postgres`,
            `DB_POSTGRESDB_PORT=5432`,
            `DB_POSTGRESDB_DATABASE=n8n`,
            `DB_POSTGRESDB_USER=postgres`,
            `DB_POSTGRESDB_PASSWORD=${dbPassword}`,
            `N8N_ENCRYPTION_KEY=${encryptionKey}`,
            `EXECUTIONS_MODE=queue`,
            `QUEUE_BULL_REDIS_HOST=$(PROJECT_NAME)_redis`,
            `QUEUE_BULL_REDIS_PORT=6379`,
            `QUEUE_BULL_REDIS_PASSWORD=${redisPassword}`,
            `QUEUE_BULL_REDIS_DB=2`,
            `N8N_HOST=https://${domain}`,
            `N8N_EDITOR_BASE_URL=https://${domain}`,
            `N8N_PROTOCOL=https`,
            `NODE_ENV=production`,
            `WEBHOOK_URL=https://${webhookDomain}/`,
            `NODE_FUNCTION_ALLOW_EXTERNAL=*`,
            `EXECUTIONS_DATA_PRUNE=true`,
            `EXECUTIONS_DATA_MAX_AGE=336`,
            `GENERIC_TIMEZONE=${timezone}`,
            `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`,
            `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`,
            `N8N_TRUST_PROXY=true`
        ];

        const n8nMainEnv = [...baseEnv];
        n8nMainEnv.push(`OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true`);

        // Gerar token para runners (usado se includePythonRunner estiver ativo)
        const runnersAuthToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        if (includePythonRunner) {
            n8nMainEnv.push(`N8N_RUNNERS_ENABLED=true`);
            n8nMainEnv.push(`N8N_RUNNERS_MODE=external`);
            n8nMainEnv.push(`N8N_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0`);
            n8nMainEnv.push(`N8N_RUNNERS_AUTH_TOKEN=${runnersAuthToken}`);
            n8nMainEnv.push(`N8N_NATIVE_PYTHON_RUNNER=true`);
        }

        template.services.push({
            type: "app",
            data: {
                projectName: projectName,
                serviceName: "n8n-main",
                source: {
                    type: "image",
                    image: `n8nio/n8n:${n8nVersion}`
                },
                domains: [
                    {
                        host: domain,
                        port: 5678,
                        https: true
                    }
                ],
                env: n8nMainEnv.join('\n'),
                mounts: [
                    {
                        type: "volume",
                        name: "n8n-data",
                        mountPath: "/home/node/.n8n"
                    }
                ]
            }
        });

        // Serviço Webhook separado
        const webhookEnv = [...baseEnv];
        
        template.services.push({
            type: "app",
            data: {
                projectName: projectName,
                serviceName: "n8n-webhook",
                source: {
                    type: "image",
                    image: `n8nio/n8n:${n8nVersion}`
                },
                domains: [
                    {
                        host: webhookDomain,
                        port: 5678,
                        https: true
                    }
                ],
                env: webhookEnv.join('\n'),
                deploy: {
                    command: "n8n webhook"
                },
                mounts: [
                    {
                        type: "volume",
                        name: "n8n-data",
                        mountPath: "/home/node/.n8n"
                    }
                ]
            }
        });

        for (let i = 1; i <= workerCount; i++) {
            const workerEnv = [...baseEnv];

            // Workers precisam das variáveis de runner para aceitar conexões do sidecar
            if (includePythonRunner) {
                workerEnv.push(`N8N_RUNNERS_ENABLED=true`);
                workerEnv.push(`N8N_RUNNERS_MODE=external`);
                workerEnv.push(`N8N_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0`);
                workerEnv.push(`N8N_RUNNERS_AUTH_TOKEN=${runnersAuthToken}`);
                workerEnv.push(`N8N_NATIVE_PYTHON_RUNNER=true`);
            }

            template.services.push({
                type: "app",
                data: {
                    projectName: projectName,
                    serviceName: `n8n-worker-${i}`,
                    source: {
                        type: "image",
                        image: `n8nio/n8n:${n8nVersion}`
                    },
                    env: workerEnv.join('\n'),
                    deploy: {
                        command: "n8n worker"
                    },
                    mounts: [
                        {
                            type: "volume",
                            name: "n8n-data",
                            mountPath: "/home/node/.n8n"
                        }
                    ]
                }
            });
        }

        // Task Runners (apenas para Code node com Python/JavaScript)
        // Com OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true, cada worker precisa de seu próprio sidecar
        if (includePythonRunner) {
            for (let i = 1; i <= workerCount; i++) {
                template.services.push({
                    type: "app",
                    data: {
                        projectName: projectName,
                        serviceName: `n8n-runner-${i}`,
                        source: {
                            type: "image",
                            image: `n8nio/runners:${n8nVersion}`
                        },
                        env: [
                            `N8N_RUNNERS_AUTH_TOKEN=${runnersAuthToken}`,
                            `N8N_RUNNERS_TASK_BROKER_URI=http://$(PROJECT_NAME)_n8n-worker-${i}:5679`,
                            `N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT=15`
                        ].join('\n')
                    }
                });
            }
        }

        const jsonString = JSON.stringify(template, null, 2);
        jsonOutput.textContent = jsonString;
        outputSection.style.display = 'block';
        copyBtn.style.display = 'inline-block';
        
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function copyToClipboard() {
        const text = jsonOutput.textContent;
        navigator.clipboard.writeText(text).then(function() {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copiado!';
            copyBtn.style.background = '#28a745';
            copyBtn.style.color = 'white';
            
            setTimeout(function() {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 2000);
        }).catch(function(err) {
            alert('Erro ao copiar: ' + err);
        });
    }

    function downloadJSON() {
        const text = jsonOutput.textContent;
        const projectName = document.getElementById('projectName').value.trim();
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}-easypanel-template.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

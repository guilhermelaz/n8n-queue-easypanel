# N8N Queue Mode - Gerador de Template Easypanel

Gerador de templates para deploy do N8N em modo fila (Queue Mode) no Easypanel, com suporte a múltiplos workers e Python Task Runner.

## 🚀 Funcionalidades

- ✅ Configuração completa do N8N em modo fila
- ✅ Suporte a 1-5 workers configuráveis
- ✅ Integração com Redis para gerenciamento de filas
- ✅ PostgreSQL como banco de dados
- ✅ Python Task Runner opcional
- ✅ Geração automática de template JSON para Easypanel
- ✅ Interface moderna e responsiva
- ✅ Download e cópia do template gerado

## 📋 Pré-requisitos

- Uma instância do Easypanel configurada
- Domínio configurado para o N8N
- Chave de criptografia (pode ser gerada em: https://acte.ltd/utils/randomkeygen)

## 🎯 Como Usar

1. Acesse a página do gerador
2. Preencha os campos obrigatórios:
   - Nome do Projeto
   - Domínio
   - Versão do N8N
   - Timezone
   - Encryption Key
   - Número de Workers (1-5)
   - Senhas do PostgreSQL e Redis
3. Marque a opção "Incluir Python Task Runner" se desejar suporte a Python
4. Clique em "Gerar Template"
5. Copie o JSON gerado ou faça o download
6. No Easypanel, vá em "Create from JSON" e cole o template

## 🏗️ Arquitetura

O template gera os seguintes serviços:

### Serviços Base
- **PostgreSQL**: Banco de dados principal (porta 5432)
- **Redis**: Gerenciador de filas (porta 6379)

### Serviços N8N
- **n8n-main**: Instância principal com interface web
- **n8n-worker-1 até n8n-worker-5**: Workers para processar workflows
- **n8n-python-runner** (opcional): Task runner para código Python

## 🔧 Configurações

### Variáveis de Ambiente Principais

**N8N Main:**
- `EXECUTIONS_MODE=queue`: Ativa o modo fila
- `N8N_RUNNERS_ENABLED=true`: Habilita task runners
- `N8N_METRICS=true`: Ativa métricas

**Workers:**
- `QUEUE_WORKER_TIMEOUT=120`: Timeout de 120 segundos
- Compartilham mesma encryption key e configurações de DB

### Volumes

Todos os serviços N8N compartilham o volume `n8n-data` montado em `/home/node/.n8n`

## 📦 Deploy no Easypanel

1. Acesse seu painel Easypanel
2. Clique em "New Project" ou selecione um projeto existente
3. Clique em "Create from JSON"
4. Cole o JSON gerado pelo template
5. Aguarde o deploy de todos os serviços
6. Acesse o domínio configurado

## 🔐 Segurança

- Use senhas fortes para PostgreSQL e Redis
- Gere uma encryption key única e segura
- Configure HTTPS no domínio (Easypanel faz isso automaticamente)
- Não compartilhe o JSON gerado publicamente (contém senhas)

## 🌐 Deploy no GitHub Pages

Este projeto está pronto para deploy no GitHub Pages:

1. Faça push dos arquivos para um repositório GitHub
2. Vá em Settings > Pages
3. Selecione a branch main e pasta root
4. Salve e aguarde o deploy

## 📚 Referências

- [N8N Queue Mode Documentation](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [N8N Task Runners](https://docs.n8n.io/hosting/configuration/task-runners/)
- [Easypanel Documentation](https://easypanel.io/docs)
- [Easypanel Templates](https://github.com/easypanel-io/templates)

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 👨‍💻 Autor

**Guilherme Lazarotto**

---

© 2025 Guilherme Lazarotto

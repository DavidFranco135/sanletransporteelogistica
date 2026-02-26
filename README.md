# Sanle Transporte & Logística — Sistema de Gestão

Sistema completo migrado para **Firebase** (Firestore + Auth + Storage).  
Não requer servidor Node.js — é uma SPA pura com Vite + React.

---

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## 🔥 Firebase — Configuração necessária

### 1. Habilitar Authentication
No console do Firebase → **Authentication → Sign-in method → Email/Password → Ativar**

### 2. Criar o usuário admin
No console → **Authentication → Users → Add User**
- Email: `sanleadm@gmail.com`
- Senha: `654326`

### 3. Criar o documento do usuário admin no Firestore
Na coleção `users`, criar documento com os campos:
```json
{
  "email": "sanleadm@gmail.com",
  "name": "Administrador",
  "role": "admin",
  "permissions": []
}
```

### 4. Regras do Firestore (já configuradas)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Regras do Storage — adicionar no Firebase Storage
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📦 Coleções criadas automaticamente no Firestore

| Coleção | Uso |
|---|---|
| `users` | Admins e colaboradores |
| `companies` | Empresas contratantes |
| `drivers` | Motoristas |
| `vehicles` | Frota de veículos |
| `services` | Ordens de serviço (com token único) |
| `trips` | Corridas finalizadas |
| `expenses` | Receitas e despesas |
| `contracts` | Contratos com upload de arquivos |

---

## 📄 PDFs Gerados

Todos os PDFs incluem:
- **Logo da Sanle** no cabeçalho
- **SANLE TRANSPORTES LOGISTICA LTDA - ME — CNPJ 46.265.852/0001-01**
- Dados completos da corrida/relatório
- Assinatura do usuário (quando aplicável)

---

## 📱 PWA — Instalar no celular

O app pode ser instalado como PWA (ícone da Sanle na tela inicial).  
No Chrome mobile: menu → "Adicionar à tela inicial".

---

## 🔗 Link do Motorista

Cada serviço gera um link único: `/servico/{token}`
- Capa com logo da Sanle
- Motorista aceita → preenche KM, assinatura, paradas
- Ao finalizar, gera PDF com logo e dados da empresa

---

## 🏗 Build para produção

```bash
npm run build
```

Deploy a pasta `dist/` em qualquer hosting estático (Firebase Hosting, Vercel, Netlify, etc.)

### Deploy no Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: dist, SPA: yes
npm run build
firebase deploy
```

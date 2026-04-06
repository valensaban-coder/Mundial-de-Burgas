# 🍔 Mundial de Hamburgueserías

App para puntuar hamburgueserías entre 4 jurados. Los datos se guardan online y son compartidos entre todos.

---

## Setup en 5 pasos

### 1. Crear cuenta en JSONBin (gratis)
- Entrá a https://jsonbin.io y registrate
- En el dashboard, creá un **nuevo Bin** con este contenido inicial:
```json
{ "burgers": [] }
```
- Copiá el **Bin ID** (aparece en la URL: `/v3/b/ESTE_ES_EL_ID`)
- En **API Keys**, copiá tu **X-Master-Key**

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables locales
```bash
cp .env.example .env.local
```
Editá `.env.local` con tus datos:
```
VITE_JSONBIN_KEY=tu_master_key
VITE_JSONBIN_ID=tu_bin_id
```

### 4. Probar local
```bash
npm run dev
```
Abrí http://localhost:5173

### 5. Subir a GitHub y deployar en Vercel

```bash
# Subir a GitHub
git init
git add .
git commit -m "Mundial de Hamburgueserías 🍔"
git remote add origin https://github.com/TU_USUARIO/mundial-hamburguesas.git
git push -u origin main
```

Después en **Vercel**:
1. Importá el repo desde vercel.com
2. Antes de deployar, en **Environment Variables** agregá:
   - `VITE_JSONBIN_KEY` → tu master key
   - `VITE_JSONBIN_ID` → tu bin id
3. Click en **Deploy**

¡Listo! Todos los que entren a la URL van a ver la misma tabla. 🏆

---

## Stack
- React 18 + Vite
- JSONBin.io (storage compartido)
- Deploy: Vercel (gratis)

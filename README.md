# UZKO

Tashqi platforma wrapperlari va deploy qoldiqlarisiz tozalangan loyiha.

## Local ishga tushirish

```bash
npm install
npm run dev
```

## Build tekshirish

```bash
npm run build
```

## Builddan keyin server preview

```bash
npm start
```

`node_modules` va `dist` `.gitignore`da turadi, GitHubga push qilinmaydi.

## Free deploy

Ushbu loyiha `Netlify` free rejasiga tayyor. Build natijasi `dist/client` ichiga chiqadi, `netlify.toml` esa SPA route fallback’ni sozlab beradi.

### Tavsiya etilgan yo'l

1. Kodni GitHub’ga push qiling.
2. Netlify’da `Add new project` → `Import an existing project` tanlang.
3. Repository’ni ulang.
4. Build settings quyidagicha bo‘lsin:
   - Build command: `npm run build`
   - Publish directory: `dist/client`
5. Deploy’ni tasdiqlang.

### Lokal tekshiruv

```bash
npm run build
npm run preview
```

### Eslatma

- `npm run start` bu yerda server preview uchun, free static deploy uchun kerak emas.
- `dist/server` build chiqadi, lekin Netlify static hostda asosiy publish papka `dist/client` bo‘ladi.

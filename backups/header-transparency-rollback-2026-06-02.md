# Rollback backup - Header transparency change (2026-06-02)

Este archivo guarda el estado anterior de los bloques tocados para poder revertir rapido.

## src/components/Header.tsx

### Firma anterior del componente

```tsx
export function Header() {
```

### Header anterior

```tsx
return (
  <header className="header-shell">
```

## src/app/page.tsx

### Uso anterior en Home

```tsx
<Hero
  products={filteredGames.length > 0 ? filteredGames : products}
  headerSlot={<Header />}
/>
```

## src/styles/globals.scss

### Bloque anterior de .header-shell

```scss
.header-shell {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(18px);
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.4), transparent);
  border-bottom: 1px solid rgba(30, 64, 175, 0.5);
  color: #f1f5f9;
}
```

### Nota

Para revertir, restaura los bloques anteriores en:
- src/components/Header.tsx
- src/app/page.tsx
- src/styles/globals.scss

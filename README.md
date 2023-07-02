# ddc-source-nvim-lua

Neovim Lua source for ddc.vim.

## Features

- The type is in |ddc-item-attribute-kind|.

```lua
-- `|` means cursor.
vim.|
-- ┌─────────────────────────┐
-- │api       table    [Lua] │
-- │print     function [Lua] │
-- │...                      │
-- └─────────────────────────┘
```

- Escaping is performed if necessary on |ddc-source-attribute-onCompleteDone|.
  Please confirm explicitly with |pum#map#confirm()|, etc.

```lua
vim.fn.ddc#enable
-- After confirming
vim.fn["ddc#enable"]
```

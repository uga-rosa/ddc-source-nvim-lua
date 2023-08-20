local M = {}

---@class DdcItem
---@field word string
---@field abbr? string
---@field menu? string
---@field info? string
---@field kind? string
---@field user_data? UserData
---@field highlights? PumHighlight[]
---@field columns? table<string, string>
---@field [1] string

---@class PumHighlight
---@field name string
---@field type "abbr" | "kind" | "menu"
---@field hl_group string
---@field col number
---@field width number

---@class UserData
---@field name string same as item.word
---@field help_tag string
---@field key_type string

---@generic T
---@param dst T[]
---@param src T[]
---@return T[]
local function list_extend(dst, src)
  return vim.list_extend(dst, src)
end

---@param parent string[]
---@return DdcItem[]
function M.items(parent)
  local target = _G
  local target_keys = vim.tbl_keys(target)
  for _, name in ipairs(parent) do
    if type(target[name]) == "table" then
      target = target[name]
      target_keys = vim.tbl_keys(target)
    else
      return {}
    end
  end

  local parent_s = table.concat(parent, ".")

  ---@type DdcItem[], DdcItem[]
  local before, after = {}, {}
  for _, key in ipairs(target_keys) do
    if type(key) == "string" and key:find("^%a[%a_]*$") then
      table.insert(before, M.item(key, target[key], parent_s))
    else
      table.insert(after, M.item(key, target[key], parent_s))
    end
  end

  return list_extend(before, after)
end

---@param str string
---@param ... string
---@return boolean
local function startswith(str, ...)
  for _, pre in ipairs({ ... }) do
    if vim.startswith(str, pre) then
      return true
    end
  end
  return false
end

---@param key unknown
---@param value unknown
---@param parent string
---@return DdcItem
function M.item(key, value, parent)
  local word = tostring(key)
  local help_tag = ""
  if parent == "vim.api" then
    help_tag = word
  elseif
    startswith(
      parent,
      "vim",
      "coroutine",
      "package",
      "string",
      "table",
      "math",
      "io",
      "os",
      "debug"
    )
  then
    help_tag = parent .. "." .. word
  end
  return {
    word = word,
    kind = type(value),
    user_data = {
      name = word,
      help_tag = help_tag,
      key_type = type(key),
    },
  }
end

return M

local M = {}

---@class DdcItem
---@field word string
---@field abbr? string
---@field menu? string
---@field info? string
---@field kind? string
---@field user_data? unknown
---@field highlights? PumHighlight[]
---@field columns? table<string, string>
---@field [1] string

---@class PumHighlight
---@field name string
---@field type "abbr" | "kind" | "menu"
---@field hl_group string
---@field col number
---@field width number

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

  ---@type DdcItem[], DdcItem[]
  local before, after = {}, {}
  for _, key in ipairs(target_keys) do
    if type(key) == "string" and key:find("^%a[%a_]*$") then
      table.insert(before, M.item(key, target[key]))
    else
      table.insert(after, M.item(key, target[key]))
    end
  end

  return list_extend(before, after)
end

---@param key unknown
---@param value unknown
---@return DdcItem
function M.item(key, value)
  return {
    word = tostring(key),
    kind = type(value),
    user_data = {
      key_type = type(key),
    },
  }
end

return M

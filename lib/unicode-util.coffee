module.exports =
class UnicodeUtil
  @unicode = require('./unicode.coffee')

  # Surrogate Charracter Range
  @highSurrogateRange = [0xD800..0xDBFF]
  @lowSurrogateRange = [0xDC00..0xDFFF]

  @getBlockName: (str) ->
    charCode = str.charCodeAt()
    # Surrogete pair
    if charCode in @highSurrogateRange
      charCodeHigh = charCode
      charCodeLow = str.charCodeAt(1)
      if charCodeLow in @lowSurrogateRange
        charCode = 0x10000 + (charCodeHigh - 0xD800) * 0x400 + (charCodeLow - 0xDC00);
    for block in @unicode
      if charCode in block[0]
        return block[1]
    return null

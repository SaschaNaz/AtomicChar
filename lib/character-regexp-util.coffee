module.exports =
class CharaterRegexpUtil

  @combineRegexp: (regexpList...) ->
    regexpString = ""
    regexpString += "["
    for regexp in regexpList
      str = regexp.source
      if str.length == 0
        continue
      if str.startWith("[") and str.endWith("]")
        regexpString += str.substr(1, str.length - 2)
      else
        regexpString += str
    regexpString += "]"
    return new RegExp(regexpString)

  @string2regexp: (strList...) ->
    regexpString = ""
    regexpString += "["
    for str in strList
      regexpString += str
    regexpString += "]"
    return new RegExp(regexpString)

  @code2uchar: (code) ->
    str = "\\u"
    if code < 0
      # no Unicode code
      return ""
    else if code < 0x10
      str += "000"
    else if code < 0x100
      str += "00"
    else if code < 0x1000
      str += "0"
    else if code < 0x10000
      # do nothing
    else if code < 0x110000
      # only High Surrogate
      code = (code - 0x10000) / 0x400 + 0xD800
    else
      # no Unicode code
      return ""
    str += code.toString(16).toUpperCase()
    return str

  @char2uchar: (char) ->
    return @code2uchar(char.codeCodeAt(0))

  @range2string: (range) ->
    firstCode = range[0]
    lastCode = range[range.length - 1]
    return @code2uchar(firstCode) + "-" + @code2uchar(lastCode)

  @range2regexp: (range) ->
    return @string2regexp(@range2string(range))

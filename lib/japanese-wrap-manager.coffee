UnicodeUtil = require "./unicode-util"
CharacterRegexpUtil = require "./character-regexp-util"

module.exports =
class JapaneseWrapManager
  @characterClasses = require "./character-classes"

  constructor: ->
    # Not incude '　'(U+3000)
    @whitespaceCharRegexp = /[\t\n\v\f\r \u00a0\u2000-\u200b\u2028\u2029]/

    # word charater
    @wordCharRegexp = CharacterRegexpUtil.string2regexp(
        JapaneseWrapManager.characterClasses["Western characters"])

    # Characters Not Starting a Line and Low Surrogate
    @notStartingCharRexgep = CharacterRegexpUtil.string2regexp(
        JapaneseWrapManager.characterClasses["Closing brackets"],
        JapaneseWrapManager.characterClasses["Hyphens"],
        JapaneseWrapManager.characterClasses["Dividing punctuation marks"],
        JapaneseWrapManager.characterClasses["Middle dots"],
        JapaneseWrapManager.characterClasses["Full stops"],
        JapaneseWrapManager.characterClasses["Commas"],
        JapaneseWrapManager.characterClasses["Iteration marks"],
        JapaneseWrapManager.characterClasses["Prolonged sound mark"],
        JapaneseWrapManager.characterClasses["Small kana"],
        CharacterRegexpUtil.range2string(UnicodeUtil.lowSurrogateRange))

    # Characters Not Ending a Line and High Surrogate
    @notEndingCharRegexp = CharacterRegexpUtil.string2regexp(
        JapaneseWrapManager.characterClasses["Opening brackets"],
        CharacterRegexpUtil.range2string(UnicodeUtil.highSurrogateRange))

    # Character Width
    # TODO: combine chars, etc...
    @zeroWidthCharRegexp = /[\u200B-\u200F\uDC00-\uDFFF\uFEFF]/
    @halfWidthCharRegexp = /[\u0000-\u036F\u2000-\u2000A\u2122\uD800-\uD83F\uFF61-\uFFDC]/
    # @fullWidthChar = /[^\u0000-\u036F\uFF61-\uFFDC]/

    # Lin Adjustment by Hanging Punctuation
    @hangingPunctuationCharRegexp = CharacterRegexpUtil.string2regexp(
        JapaneseWrapManager.characterClasses["Full stops"],
        JapaneseWrapManager.characterClasses["Commas"])

  # overwrite Display#findWrapColumn()
  overwriteFindWrapColumn: (displayBuffer) ->
    unless displayBuffer.japaneseWrapManager?
      displayBuffer.japaneseWrapManager = @

    unless displayBuffer.originalFindWrapColumn?
      displayBuffer.originalFindWrapColumn = displayBuffer.findWrapColumn

    displayBuffer.findWrapColumn = (line, softWrapColumn=@getSoftWrapColumn()) ->
      return unless @isSoftWrapped()
      return @japaneseWrapManager.findJapaneseWrapColumn(line, softWrapColumn)

  # restore Display#findWrapColumn()
  restoreFindWrapColumn: (displayBuffer) ->
    if displayBuffer.originalFindWrapColumn?
      displayBuffer.findWrapColumn = displayBuffer.originalFindWrapColumn
      displayBuffer.originalFindWrapColumn = undefined

    if displayBuffer.japaneseWrapManager?
      displayBuffer.japaneseWrapManager = undefined

  # Japanese Wrap Column
  findJapaneseWrapColumn: (line, sotfWrapColumn) ->
    # If all characters are full width, the width is twice the length.
    return unless (line.length * 2) > sotfWrapColumn
    size = 0
    for wrapColumn in [0...line.length]
      if @zeroWidthCharRegexp.test(line[wrapColumn])
        continue
      else if @halfWidthCharRegexp.test(line[wrapColumn])
        size = size + 1
      else
        size = size + 2

      if size > sotfWrapColumn
        column = @searchBackwardNotEndingColumn(line, wrapColumn)
        if column?
          return column

        column = @searchForwardWhitespaceCutableColumn(line, wrapColumn)
        if column? and column != wrapColumn
          return column

        # TODO: change to call searchBackwardCutableColumn
        if @wordCharRegexp.test(line[wrapColumn])
          # search backward for the start of the word on the boundary
          for column in [wrapColumn..0]
            return column + 1 unless @wordCharRegexp.test(line[column])
          return wrapColumn
        else if @notStartingCharRexgep.test(line[wrapColumn])
          # Character Not Starting a Line
          for column in [wrapColumn...0]
            return column unless @notStartingCharRexgep.test(line[column])
          return wrapColumn
        else
          return wrapColumn
    return

  searchBackwardNotEndingColumn: (line, wrapColumn) ->
    foundNotEndingColumn = null
    for column in [(wrapColumn - 1)..0]
      if @whitespaceCharRegexp.test(line[column])
        continue
      else if @notEndingCharRegexp.test(line[column])
        foundNotEndingColumn = column
      else
        return foundNotEndingColumn
    return

  searchForwardWhitespaceCutableColumn: (line, wrapColumn) ->
    for column in [wrapColumn...line.length]
      unless @whitespaceCharRegexp.test(line[column])
        if @notStartingCharRexgep.test(line[column])
          return null
        else
          return column
    return line.length

  # TODO ...
  searchBackwardCutableColumn: (line, wrapColumn, cutable = true) ->
    for column in [(wrapColumn)..0]
      if @whitespaceCharRegexp.test(line[column])
        if cutable
          continue
      else if @wordCharRegexp.test(line[wrapColumn])
        #if preWord
        #  continue
        #else if
        return
        #if @wordCharRegexp.test(line[wrapColumn])
        #for column in [wrapColumn..0]
        #  return column + 1 unless @wordCharRegexp.test(line[column])
        #return wrapColumn
      else if @notEndingCharRegexp.text(line[wrapColumn])
      else if @notStartingCharRexgep.test(line[wrapColumn])
        # Character Not Starting a Line
        for column in [wrapColumn...0]
          return column unless @notStartingCharRexgep.test(line[column])
        return wrapColumn
      else
        return wrapColumn

      if @notStartingCharRegexp.test(line[column])
        foundNotStartingColumn = column
      else if foundNotStartingColumn? and @notEndingCharRegexp.test(line[column])
        return @searchBackwardNotEndingColumn(line, column + 1)
      else
        return column
    return

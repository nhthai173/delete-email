// Config for global sheet
const GLOBAL_FILTER_SHEET = {
  id: '1r6VXfO9Xc1xjmrOpBzd-4EAAaMKKx3E9cIxmUfGq7K0',
  name: 'Global',
  path: {
    from: 0,
    subject: 1,
    body: 2,
    time: 3,
    id: 4
  }
}



/**
 * Match the time
 * @param{string} timeStr time string
 * @param{number} mailTime unix timestamp
 */
function matchTime(timeStr = '', mailTime = 0) {
  const base = 24 * 3600000
  const m = {
    'day': base,
    'week': 7 * base,
    'month': 30 * base,
    'quarter': 90 * base,
    'year': 365 * base,
    'd': base,
    'w': 7 * base,
    'm': 30 * base,
    'y': 365 * base
  }
  if (timeStr) {
    for (const i in m) {
      if (timeStr.indexOf(i)) {
        let time = parseFloat(timeStr.substring(0, timeStr.indexOf(i)))
        if (time && !TTools.isEmptyVariable(mailTime)) {
          time = time * m[ i ]
          const curr = new Date().getTime()
          if (curr >= mailTime + time) {
            return true
          }
        }
        return false
      }
    }
  }
  return true
}



function matchFilter(mailDetail = {}, filter = {}, customFilter = null, fields = []) {
  let valid = []
  if (!TTools.isValidArray(fields)) fields = [ 'from', 'subject', 'body' ]
  if (!TTools.isValidObject(mailDetail)) return false

  // Match with custom filter
  let usedCustomFilter = false
  if (customFilter && typeof customFilter === 'function') {
    const customFilterResult = customFilter(mailDetail.class)
    if (customFilterResult === true) {
      usedCustomFilter = true
      valid.push(true)
    } else if (customFilterResult === false) {
      usedCustomFilter = true
      valid.push(false)
    }
  }

  // Match with default filter
  if (!usedCustomFilter) {
    // Match text
    for (const j in fields) {
      const field = fields[ j ]
      if (filter && !TTools.isEmptyVariable(filter[ field ])) {
        let matched = 0
        const keys = filter[ field ].split(',')
        keys.forEach(s => {
          const raw = TTools.toRawText(mailDetail[ field ])
          if (raw.includes(TTools.toRawText(s))) matched++
        })
        if (matched > 0 && matched == keys.length) {
          valid.push(true)
        } else {
          valid.push(false)
        }
      }
    }
    // Match time
    if (filter && !TTools.isEmptyVariable(filter.time)) {
      if (mailDetail.date && mailDetail.date.getTime && typeof mailDetail.date.getTime === 'function') {
        if (matchTime(filter.time, mailDetail.date.getTime())) {
          valid.push(true)
        } else {
          valid.push(false)
        }
      }
    }
  }

  return valid.length && !valid.some(v => v === false)
}


function globalFilterMatch(mailDetail = {}, filter = []) {
  let output = {
    matched: false,
    id: null
  }

  if (!TTools.isValidObject(mailDetail)) return output
  if (!TTools.isValidArray(filter)) {
    filter = getGlobalFilter()
  }
  if (!TTools.isValidArray(filter)) return output

  for (const i in filter) {
    if (matchFilter(mailDetail, filter[ i ])) {
      output.matched = true
      output.id = filter[ i ][ 'id' ] || null
      break
    }
  }

  return output
}



function getFilterFromSheet(sheetId = '', sheetName = '', path = {}) {
  let output = []

  if (!sheetId) return output
  if (!sheetName) return output
  if (!TTools.isValidObject(path)) return output

  output = TTools.BillSheet({
    sheetId,
    sheetName,
    path
  }).getAsJSON()

  return output
}



function getGlobalFilter() {
  if (!TTools.isValidObject(GLOBAL_FILTER_SHEET)) return []
  return getFilterFromSheet(
    GLOBAL_FILTER_SHEET.id,
    GLOBAL_FILTER_SHEET.name,
    GLOBAL_FILTER_SHEET.path)
}


function getAllMessages({
  includeSpam = true,
  includeTrash = false,
  limit = 0
} = {},
  callback) {

  let msgs = []
  const opt = {}

  if (includeSpam || includeTrash) opt.includeSpamTrash = true
  if (limit > 0) opt.maxResults = limit

  // Try with Gmail API
  try {
    let pageToken
    do {
      const messageList = Gmail.Users.Messages.list('me', {
        pageToken: pageToken,
        ...opt
      })
      if (messageList.messages && messageList.messages.length) {
        messageList.messages.forEach(msg => {
          const id = msg.id
          try {
            const message = GmailApp.getMessageById(id)
            if (TTools.isValidObject(message)) {
              if (callback && typeof callback === 'function') {
                if (!includeTrash && message.isInTrash()) return
                callback(message)
              }
              msgs.push(message)
            }
          } catch (err) { console.warn({ type: 'error', msgId: id, detail: err }) }
        })
      }
      pageToken = messageList.nextPageToken
    } while (pageToken)
  } catch (err) { console.warn(err) }

  // Use basic GmailApp
  if (!TTools.isValidArray(msgs)) {
    try {
      GmailApp.getInboxThreads().forEach(thread => {
        const messages = thread.getMessages()
        if (callback && typeof callback === 'function') {
          messages.forEach(msg => {
            if (!includeTrash && msg.isInTrash()) return
            callback(msg)
          })
        }
        msgs = [ ...msgs, ...messages ]
      })
    } catch (err) { console.warn(err) }
  }

  return msgs
}
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
function matchTime(timeStr = '', mailTime = 0){
  const base = 24*3600000
  const m = {
    'day': base,
    'week': 7*base,
    'month': 30*base,
    'quarter': 90*base,
    'year': 365*base,
    'd': base,
    'w': 7*base,
    'm': 30*base,
    'y': 365*base
  }
  if(timeStr){
    for(const i in m){
      if(timeStr.indexOf(i)){
        let time = parseFloat(timeStr.substring(0, timeStr.indexOf(i)))
        if(time && !TTools.isEmptyVariable(mailTime)){
          time = time*m[i]
          const curr = new Date().getTime()
          if(curr >= mailTime+time){
            return true
          }
        }
        return false
      }
    }
  }
  return true
}



function matchFilter(mailDetail = {}, filter = {}, customFilter = {}, fields = []){
  let valid = []
  if(!TTools.isValidArray(fields)) fields = ['from', 'subject', 'body']
  if(!TTools.isValidObject(mailDetail)) return false

  // Match text
  for(const j in fields){
    const field = fields[j]
    if(filter && !TTools.isEmptyVariable(filter[field])){
      if (customFilter && customFilter[ field ] && typeof customFilter[ field ] === 'function'){
        if (customFilter[ field ](mailDetail)){
          valid.push(true)
        }else{
          valid.push(false)
        }
      }else{
        let matched = 0
        const keys = filter[field].split(',')
        keys.forEach(s => {
          const raw = TTools.toRawText(mailDetail[ field ])
          if (raw.includes(TTools.toRawText(s))) matched++
        })
        if(matched > 0 && matched == keys.length){
          valid.push(true)
        }else{
          valid.push(false)
        }
      }
    }
  }

  // Match time
  if (filter && !TTools.isEmptyVariable(filter.time)) {
    if(mailDetail.date && mailDetail.date.getTime && typeof mailDetail.date.getTime === 'function'){
      if (matchTime(filter.time, mailDetail.date.getTime())) {
        valid.push(true)
      } else {
        valid.push(false)
      }
    }
  }

  return valid.length && valid.reduce((prv, cur) => prv && cur, true)
}


function globalFilter(mailDetail = {}){
  let output = {
    matched: false,
    id: null
  }

  if(!TTools.isValidObject(mailDetail)) return output
  
  const data = TTools.BillSheet({
    sheetId: GLOBAL_FILTER_SHEET.id,
    sheetName: GLOBAL_FILTER_SHEET.name,
    path: GLOBAL_FILTER_SHEET.path
  }).getAsJSON()
  if(!TTools.isValidArray(data)) return output

  for(const i in data){
    if(matchFilter(mailDetail, data[i])){
      output.matched = true
      output.id = data[i]['id'] || null
      break
    }
  }

  return output
}



function EmailDetailFilter(message, {
  filter = [],
  customFilter = {},
  useGlobalFilter = true,
  customFuntions = {}
} = {}){

  if(!TTools.isValidObject(message)) return

  const msg = {
    'id': message.getId(),
    'from': message.getFrom(),
    'subject': message.getSubject(),
    'body': message.getBody(),
    'date': message.getDate(),
    'thread': message.getThread(),
    'attachments': message.getAttachments(),
    'class': message
  }

  let isMatched = false
  let globalMatch = {matched: false}
  let sheetMatched = {} // to run customFuntions

  // Skip trashed
  if(msg.class.isInTrash()) return

  for(const i in filter) {
    if(matchFilter(msg, filter[i], customFilter)){
      isMatched = true
      sheetMatched = filter[i]
      break
    }
  }
  if(!isMatched && useGlobalFilter) globalMatch = globalFilter(msg)

  if(isMatched || globalMatch.matched){
      try{

        const id = sheetMatched.id || globalMatch.id
        console.log('Matched', {
          id: msg.id,
          matchId: id,
          from: msg.from,
          subject: msg.subject,
          matchType: isMatched ? 'sheet' : 'global',
          sheetData: isMatched ? sheetMatched : {}
        })
        if(id && TTools.isValidObject(customFuntions) && typeof customFuntions[id] === 'function'){
          console.log('=> Run custom function: ', id, msg.id)
          customFuntions[id](message)
        }else{
          console.log('=> Move to trash: ', msg.id)
          msg.class.moveToTrash()
        }

      }catch(e) { console.warn(e) }
  }
}



function EmailFilter({
  sheetId = '',
  sheetName = '',
  path = {/*
    from,
    subject,
    body,
    time,
    id  
  */},
  filter = [],
  useGlobalFilter = true,
  from = null,
  subject = null,
  body = null,
  customFuntions = null
} = {}){
  
  const customFilter = {
    from,
    subject,
    body
  }

  // Not found filter input, try to get from sheet
  if(!TTools.isValidArray(filter)){
    filter = TTools.BillSheet({sheetId, sheetName, path}).getAsJSON()
  }
  
  getAllMessages({}, message => {
    EmailDetailFilter(message, {
      filter,
      customFilter,
      customFuntions,
      useGlobalFilter
    })
  })
  
}




function getAllMessages({
  includeSpam = true,
  includeTrash = false,
  limit = 0
} = {},
callback){

  let msgIds = []
  let msgs = []
  const opt = {}
  
  if(includeSpam) opt.includeSpamTrash = true
  if(limit > 0) opt.maxResults = limit

  // Try with Gmail API
  try {
    let pageToken
    do {
      const threadList = Gmail.Users.Threads.list('me', {
        pageToken: pageToken,
        ...opt
      })
      if (threadList.threads && threadList.threads.length) {
        threadList.threads.forEach(thread => {
          const id = thread.id
          if(id) msgIds.push(id)
        })
      }
      pageToken = threadList.nextPageToken
    } while (pageToken)
  } catch (err) { console.warn(err) }
  if(msgIds.length){
    msgIds.forEach(msgId => {
      try{
        const msg = GmailApp.getMessageById(msgId)
        if(TTools.isValidObject(msg)){
          if(callback && typeof callback === 'function'){
            if(!includeTrash && msg.isInTrash()) return
            callback(msg)
          }
          msgs.push(msg)
        }
      }catch(err) { console.warn(err) }
    })
  }

  // Use basic GmailApp
  else{
    try{
      GmailApp.getInboxThreads().forEach(thread => {
        const messages = thread.getMessages()
        if(callback && typeof callback === 'function'){
          messages.forEach(msg => {
            if(!includeTrash && msg.isInTrash()) return
            callback(msg)
          })
        }
        msgs = [...msgs, ...messages]
      })
    } catch(err) { console.warn(err) }
  }

  return msgs
}
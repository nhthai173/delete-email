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
        if(!isNaN(time) && time > 0 && !TTools.isEmptyVariable(mailTime)){
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


function matchFilter(mailDetail = {}, filter = {}, customFilter = {}){
  const fields = ['from', 'subject', 'body']
  let valid = []

  // Match text
  for(const j in fields){
    const field = fields[j]
    if(!TTools.isEmptyVariable(filter[field])){
      if (customFilter[ field ] && typeof customFilter[ field ] === 'function'){
        if (customFilter[ field ](mailDetail)){
          valid.push(true)
        }else{
          valid.push(false)
        }
      }else{
        let matched = 0
        const keys = filter[field].split(',')
        keys.forEach(s => {
          if (mailDetail[ field ].toLowerCase().includes(s.toLowerCase())) matched++
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
  if (!TTools.isEmptyVariable(filter.time)) {
    if (matchTime(filter.time, mailDetail.date.getTime())) {
      valid.push(true)
    } else {
      valid.push(false)
    }
  }

  return valid.length && valid.reduce((prv, cur) => prv && cur, true)
}


function globalFilter(mailDetail = {}){
  let output = {
    matched: false,
    id: null
  }

  const data = TTools.BillSheet({
    sheetId: GLOBAL_FILTER_SHEET.id,
    sheetName: GLOBAL_FILTER_SHEET.name,
    path: GLOBAL_FILTER_SHEET.path
  }).getAsJSON()

  if(!TTools.isValidArray(data)) return output
  if(!TTools.isValidObject(mailDetail)) return output

  for(const i in data){
    if(matchFilter(mailDetail, data[i])){
      output.matched = true
      output.id = data[i]['id'] || null
      break
    }
  }

  return output
}



function EmailDetailFilter(detail = {}, {
  filter = [],
  customFilter = {},
  useGlobalFilter = true,
  customFuntions = {}
} = {}){
  let isMatched = false
  let globalMatch = {matched: false}
  let sheetMatched = {} // to run customFuntions

  // Skip trashed
  if(detail.class.isInTrash()) return

  for(const i in filter) {
    if(matchFilter(detail, filter[i], customFilter)){
      isMatched = true
      sheetMatched = filter[i]
      break
    }
  }
  if(!isMatched) globalMatch = globalFilter(detail)

  if(isMatched ||
    ( useGlobalFilter && globalMatch.matched )){
      const id = sheetMatched.id || globalMatch.id
      console.log('Matched', {
        id: detail.id,
        matchId: id,
        from: detail.from,
        subject: detail.subject,
        matchType: isMatched ? 'sheet' : 'global',
        sheetData: isMatched ? sheetMatched : {}
      })
      if(id && TTools.isValidObject(customFuntions) && typeof customFuntions[id] === 'function'){
        console.log('=> Run custom function: ', id, detail.id)
        customFuntions[id](detail)
      }else{
        console.log('=> Move to trash: ', detail.id)
        detail.class.moveToTrash()
      }
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
  const sheet = TTools.BillSheet({sheetId, sheetName, path})
  const data = sheet.getAsJSON()
  
  GmailApp.getInboxThreads().forEach(thread => {
    thread.getMessages().forEach(message => {
      const detail = {
        'id': message.getId(),
        'from': message.getFrom(),
        'subject': message.getSubject(),
        'body': message.getBody(),
        'date': message.getDate(),
        'thread': message.getThread(),
        'attachments': message.getAttachments(),
        'class': message
      }
      EmailDetailFilter(detail, {
        filter: data,
        customFilter,
        customFuntions,
        useGlobalFilter
      })
    })
  })

}
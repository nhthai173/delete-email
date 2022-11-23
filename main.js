function EmailDetailFilter(message, {
  debug = false,
  filter = [],
  customFilter = null,
  useGlobalFilter = true,
  globalFilter = [],
  customFunction = {}
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

  // Debug
  if(debug){
    console.log({
      message_id: msg.id,
      sender: msg.from,
      subject: msg.subject,
      time: msg.date.toLocaleString('vi')      
    })
  }

  let isMatched = false
  let globalMatch = {matched: false}
  let sheetMatched = {} // to run customFunction

  // Skip trashed
  if(msg.class.isInTrash()) return

  for(const i in filter) {
    if(matchFilter(msg, filter[i], customFilter)){
      isMatched = true
      sheetMatched = filter[i]
      break
    }
  }
  if(!isMatched && useGlobalFilter) globalMatch = globalFilterMatch(msg, globalFilter)

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
        if(id && TTools.isValidObject(customFunction) && typeof customFunction[id] === 'function'){
          console.log('=> Run custom function: ', id, msg.id)
          customFunction[id](message)
        }else{
          console.log('=> Move to trash: ', msg.id)
          msg.class.moveToTrash()
        }

      }catch(e) { console.warn(e) }
  }
}



function EmailFilter({
  debug = false,
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
  customFilter = null,
  customFunction = null
} = {}){

  // Get global filter
  let globalFilter = []
  if(useGlobalFilter){
    globalFilter = getGlobalFilter()
  }

  // Try to get filters from sheet
  if(!TTools.isValidArray(filter)){
    filter = getFilterFromSheet(sheetId, sheetName, path)
  }
  
  getAllMessages({}, message => {
    EmailDetailFilter(message, {
      debug,
      filter,
      customFilter,
      customFunction,
      useGlobalFilter,
      globalFilter
    })
  })
  
}
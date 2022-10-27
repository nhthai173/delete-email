# Delete Email Filtered

This is a simple script to delete emails from your Gmail account with filters applied.

Emails are moved to the trash folder and then deleted after 30 days.

Filters can get from Google Sheet or a JSON file.

### GAS Project ID

Import this script as a library to your script.

```
1diMNfkgtlWQDwmLjO5YEdGOEDt9pQfIqnc1MZgl1I_jC20fp96K5du1g
```

### [Documentation](#)

---

### Simple Usage

It will be got all inbox emails and delete them.

```javascript
DeleteEmailFiltered.EmailFilter()
```

### Use with options

[More detail](#email-filter)

```javascript
/* Filters from sheet */
const sheet = {
    sheetId = 'Your GG Sheet id',
    sheetName = 'Sheet name',
    path = {/*
    key-index pairs
        from: sender address,
        subject: email subject,
        body: email body,
        time: hold time,
        id: id to run custom function
    */},
}
const options = {
    filter: []  // filters
    ...sheet    // or get from sheet
    useGlobalFilter = true,
    from = null,    // custom match function
    subject = null, // custom match function
    body = null,    // custom match function
    customFuntions = null // custom function
}

DeleteEmailFiltered.EmailFilter(options)
```

### Only delete emails

This function will give you more flexibility to integrate.

It only filter and delete emails with the email detail provided.

[More detail](#email-detail-filter)

```javascript
GmailApp.getInboxThreads().forEach(thread => {
    thread.getMessages().forEach(message => {
      DeleteEmailFiltered.EmailDetailFilter(message, options)
    })
})

```
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

```javascript
/**
 *  Call DeleteEmailFiltered.EmaiilFilter() to simply delete all emails match global filters.
 * Global filters: https://docs.google.com/spreadsheets/d/1r6VXfO9Xc1xjmrOpBzd-4EAAaMKKx3E9cIxmUfGq7K0/edit#gid=2082535793
 * You can custom filters by using following options
 */
DeleteEmailFiltered.EmailFilter({
  // Print read emails. Default is false
  debug: true,

  // Global filters. Pass false to disable global filters. Default is true
  useGlobalFilter: true,

  /**
   * Custom filters from Google Sheet.
   * sheetId: Google Sheet ID
   * sheetName: Sheet name
   * path: key-index pairs. Only accpeted kes:
   * "from": email sender
   * "subject": email subject
   * "time": Hold emails in this time, from email received time. friendly format with number + unit. The minimum unit is day. e.g. 1d, 1 day, 2w, 2 weeks, 3m, 3 months, 4y, 4 years
   * "id": The custom id to call custom functions
   */
  sheetId: "1r6VXfO9Xc1xjmrOpBzd-4EAAaMKKx3E9cIxmUfGq7K0",
  sheetName: "main",
  path: {
    from: 0,
    subject: 1,
    time: 2,
    id: 3,
  },

  // Callback function to filter emails. More detail below.
  customFilter: function (message) {},

  // Callback function to handle filtered emails. More detail below.
  customFunction: function (message) {},
});
```

### Get all emails

Get all emails from your Gmail account.

```javascript
DeleteEmailFiltered.getAllMessages(options, callback);
```

**Parameters**

<table>
    <thead>
        <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>options</td>
            <td>Object</td>
            <td>
                Options to get emails
            </td>
        </tr>
        <tr>
            <td>options.includeSpam</td>
            <td>Boolean</td>
            <td>
                Pass true to include spam emails in result. Default is true
            </td>
        </tr>
        <tr>
            <td>options.includeTrash</td>
            <td>Boolean</td>
            <td>
                Pass true to include emails in trash. Default is false
            </td>
        </tr>
        <tr>
            <td>options.limit</td>
            <td>integer</td>
            <td>
                The limit of emails to get. Default is return all emails
            </td>
        </tr>
        <tr>
            <td>callback</td>
            <td>Function</td>
            <td>Callback for each email. Input is <code>Gmail.GmailMessage</code></td>
        </tr>
    </tbody>
</table>

**Returns**

`Gmail.GmailMessage[]` Array of GmailMessage objects

---

### CustomFilter(`message`)

This function will be called with every email. This is highest priority to filter emails.

**Parameters**

| Parameter | Type                 | Description       |
| --------- | -------------------- | ----------------- |
| message   | `Gmail.GmailMessage` | The email message |

**Returns**

- `true` to delete this email
- `false` skip this email
- `undefined` to use default filters (global/sheet)

### CustomFuntions(`message`)

This function will be called after a email is matched. If no specific function is provided, that email will be deleted.

**Parameters**

| Parameter | Type                 | Description       |
| --------- | -------------------- | ----------------- |
| message   | `Gmail.GmailMessage` | The email message |

**Returns**
`undefined`

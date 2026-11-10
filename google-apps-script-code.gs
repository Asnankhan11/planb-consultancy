/**
 * ============================================================================
 * PLAN B CAREERS — GOOGLE APPS SCRIPT WEB APP INTEGRATION (Code.gs)
 * ============================================================================
 * Production Google Sheets + Google Drive Application Processor
 * 
 * SCRIPT PROPERTIES CONFIGURED (Project Settings > Script Properties):
 * - SPREADSHEET_ID  : 1XLoCJZaJxGakLDtA7AYwCSx-kTMk5wbDyJxmpF2umt0
 * - SHEET_NAME      : Applications
 * - DRIVE_FOLDER_ID : 1X2CU_o8KrQ0XojXnTL6uGUBeMJ3EhzPa
 * - API_SECRET      : [Shared secret configured with backend GOOGLE_APPS_SCRIPT_SECRET]
 * 
 * 18-COLUMN SPREADSHEET MAPPING (Sheet: Applications):
 * Col A  (1)  : Application ID (e.g. PB-20261105-1234)
 * Col B  (2)  : Application Date & Time (IST)
 * Col C  (3)  : Candidate Name
 * Col D  (4)  : WhatsApp Number
 * Col E  (5)  : Email Address
 * Col F  (6)  : City
 * Col G  (7)  : State
 * Col H  (8)  : Qualification
 * Col I  (9)  : Experience (Fresher / Experienced)
 * Col J  (10) : Experience in Years
 * Col K  (11) : Applied Job Role
 * Col L  (12) : Resume File Name
 * Col M  (13) : Google Drive Resume Link
 * Col N  (14) : Application Status (Default: "New Application")
 * Col O  (15) : Assigned HR
 * Col P  (16) : Interview Date
 * Col Q  (17) : Interview Feedback
 * Col R  (18) : HR Remarks
 * ============================================================================
 */

function getScriptConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: (props.getProperty('SPREADSHEET_ID') || '1XLoCJZaJxGakLDtA7AYwCSx-kTMk5wbDyJxmpF2umt0').trim(),
    sheetName: (props.getProperty('SHEET_NAME') || 'Applications').trim(),
    driveFolderId: (props.getProperty('DRIVE_FOLDER_ID') || '1X2CU_o8KrQ0XojXnTL6uGUBeMJ3EhzPa').trim(),
    apiSecret: (props.getProperty('API_SECRET') || '').trim()
  };
}

function createJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeCell_(value) {
  var result = String(value == null ? '' : value).slice(0, 4000);
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(result) ? "'" + result : result;
}

function sameSecret_(left, right) {
  left = String(left || ''); right = String(right || '');
  var difference = left.length ^ right.length;
  for (var i = 0; i < Math.max(left.length, right.length); i++) difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return difference === 0;
}

function doGet(e) {
  return createJsonResponse_({
    success: true,
    service: 'Plan B Careers Google Apps Script Integration',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse_({
      success: false,
      error: 'Server is busy processing submissions. Please retry.'
    });
  }

  try {
    var config = getScriptConfig_();

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse_({
        success: false,
        error: 'Missing POST body data.'
      });
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse_({
        success: false,
        error: 'Invalid JSON request format.'
      });
    }

    if (!config.apiSecret) {
      return createJsonResponse_({
        success: false,
        error: 'API_SECRET is not configured in Script Properties.'
      });
    }

    if (!payload.secret || !sameSecret_(payload.secret, config.apiSecret)) {
      return createJsonResponse_({
        success: false,
        error: 'Unauthorized: Invalid or missing API secret.'
      });
    }

    var appId = String(payload.applicationId || '').trim();
    if (!appId) {
      return createJsonResponse_({
        success: false,
        error: 'Application ID (applicationId) is required.'
      });
    }

    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) {
      return createJsonResponse_({
        success: false,
        error: 'Worksheet tab "' + config.sheetName + '" not found in spreadsheet.'
      });
    }

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        var existingId = String(idValues[i][0]).trim();
        if (existingId && existingId.toUpperCase() === appId.toUpperCase()) {
          var rowIndex = i + 2;
          var rowData = sheet.getRange(rowIndex, 1, 1, 19).getValues()[0];
          if (payload.requestHash && rowData[18] && String(rowData[18]) !== String(payload.requestHash)) {
            return createJsonResponse_({ success: false, error: 'Submission identifier conflict.' });
          }
          var existingFileName = String(rowData[11] || '');
          var existingDriveUrl = String(rowData[12] || '');

          return createJsonResponse_({
            success: true,
            duplicate: true,
            applicationId: appId,
            resumeName: existingFileName || (payload.resumeFileName || 'Resume.pdf'),
            resumeUrl: existingDriveUrl,
            message: 'Application already received and recorded in Google Sheets & Drive.'
          });
        }
      }
    }

    if (!payload.resumeBase64 || typeof payload.resumeBase64 !== 'string' || payload.resumeBase64.length === 0) {
      return createJsonResponse_({
        success: false,
        error: 'Resume base64 data is required for new applications.'
      });
    }

    var driveFolder;
    try {
      driveFolder = DriveApp.getFolderById(config.driveFolderId);
    } catch (folderErr) {
      return createJsonResponse_({
        success: false,
        error: 'Unable to access Google Drive folder with ID: ' + config.driveFolderId
      });
    }

    var candidateName = (payload.name || 'Candidate').trim();
    var safeName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    var rawFileName = (payload.resumeFileName || '').trim();
    var fileExt = '.pdf';
    var mimeType = 'application/pdf';

    if (/\.docx$/i.test(rawFileName)) {
      fileExt = '.docx';
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (/\.doc$/i.test(rawFileName)) {
      fileExt = '.doc';
      mimeType = 'application/msword';
    }

    var finalFileName = rawFileName || (safeName + '_' + appId + '_Resume' + fileExt);
    var decodedBytes = Utilities.base64Decode(payload.resumeBase64);
    var resumeBlob = Utilities.newBlob(decodedBytes, mimeType, finalFileName);
    var driveFile = driveFolder.createFile(resumeBlob);

    driveFile.setDescription('Plan B Careers Application ' + appId + ' | Candidate: ' + candidateName + ' | Phone: ' + (payload.whatsapp || ''));
    var driveResumeUrl = driveFile.getUrl();

    var timestampStr = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

    var newRow = [
      appId,                                         // Col A  (1)  : Application ID
      timestampStr,                                  // Col B  (2)  : Application Date
      candidateName,                                 // Col C  (3)  : Candidate Name
      String(payload.whatsapp || '').trim(),         // Col D  (4)  : WhatsApp Number
      String(payload.email || '').trim(),            // Col E  (5)  : Email Address
      String(payload.city || '').trim(),             // Col F  (6)  : City
      String(payload.state || 'Maharashtra').trim(), // Col G  (7)  : State
      String(payload.qualification || '').trim(),    // Col H  (8)  : Qualification
      String(payload.experience || 'Fresher').trim(),// Col I  (9)  : Experience
      String(payload.experienceYears || '0').trim(),  // Col J  (10) : Experience in Years
      String(payload.role || '').trim(),             // Col K  (11) : Applied Job Role
      finalFileName,                                 // Col L  (12) : Resume File Name
      driveResumeUrl,                                // Col M  (13) : Google Drive Resume Link
      'New Application',                             // Col N  (14) : Application Status
      '',                                            // Col O  (15) : Assigned HR
      '',                                            // Col P  (16) : Interview Date
      '',                                            // Col Q  (17) : Interview Feedback
      '',                                            // Col R  (18) : HR Remarks
      String(payload.requestHash || '')              // Col S  (19) : Request fingerprint
    ];

    sheet.appendRow(newRow.map(safeCell_));

    return createJsonResponse_({
      success: true,
      duplicate: false,
      applicationId: appId,
      resumeName: finalFileName,
      resumeUrl: driveResumeUrl,
      message: 'Application recorded successfully in Google Sheets and Drive.'
    });

  } catch (err) {
    return createJsonResponse_({
      success: false,
      error: 'Google Apps Script internal execution error: ' + (err.message || String(err))
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

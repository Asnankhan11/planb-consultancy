/**
 * Plan B Careers intake, version 2. Deploy as a new Web App version after review.
 * Script properties: SPREADSHEET_ID, SHEET_NAME (Applications), DRIVE_FOLDER_ID,
 * API_SECRET (same as backend GOOGLE_APPS_SCRIPT_SECRET), ADMISSIONS_SHEET_NAME.
 * Applications retain columns A:R; column S is the request fingerprint.
 * Admissions use a separate tab. Never share the resume folder publicly.
 */
function getScriptConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: (props.getProperty('SPREADSHEET_ID') || '').trim(),
    sheetName: (props.getProperty('SHEET_NAME') || 'Applications').trim(),
    admissionsSheetName: (props.getProperty('ADMISSIONS_SHEET_NAME') || 'Admissions').trim(),
    driveFolderId: (props.getProperty('DRIVE_FOLDER_ID') || '').trim(),
    apiSecret: (props.getProperty('API_SECRET') || '').trim()
  };
}
function createJsonResponse_(obj) { obj.version = 2; return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
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
function doGet() { return createJsonResponse_({ success: true, service: 'Plan B Careers intake', version: 2 }); }
function doPost(e) {
  var lock = LockService.getScriptLock(), locked = false, createdFile = null, recorded = false;
  try {
    var config = getScriptConfig_();
    if (!config.apiSecret || !config.spreadsheetId) throw new Error('Intake is not configured.');
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 4300000) throw new Error('Invalid submission.');
    var payload = JSON.parse(e.postData.contents);
    if (!sameSecret_(payload.secret, config.apiSecret)) return createJsonResponse_({ success: false, error: 'Unauthorized.' });
    var admission = payload.action === 'admission';
    var appId = String(payload.applicationId || '');
    if (!(admission ? /^PA-[A-F0-9]{32}$/ : /^PB-[A-F0-9]{32}$/).test(appId)) throw new Error('Invalid submission identifier.');
    if (!admission && !/^[a-f0-9]{64}$/.test(payload.requestHash || '')) throw new Error('Missing request fingerprint.');
    lock.waitLock(20000); locked = true;
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(admission ? config.admissionsSheetName : config.sheetName);
    if (!sheet) throw new Error('The intake worksheet is unavailable.');
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) !== appId) continue;
        if (admission) throw new Error('Duplicate enquiry identifier.');
        var existing = sheet.getRange(i + 2, 1, 1, 19).getValues()[0];
        // An ID alone never authorizes access to an earlier candidate's resume.
        if (!existing[18] || String(existing[18]) !== payload.requestHash) return createJsonResponse_({ success: false, error: 'Submission identifier conflict.' });
        return createJsonResponse_({ success: true, duplicate: true, applicationId: appId, resumeName: String(existing[11]), resumeUrl: String(existing[12]) });
      }
    }
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
    if (admission) {
      if (!payload.student_name || !/^[6-9]\d{9}$/.test(payload.mobile || '')) throw new Error('Invalid enquiry details.');
      var admissionRow = [appId, timestamp, payload.student_name, payload.mobile, payload.whatsapp_number, payload.email, payload.qualification, payload.interested_course, payload.preferred_college, payload.preferred_city, payload.admission_type, payload.additional_requirements, 'New'];
      sheet.appendRow(admissionRow.map(safeCell_)); recorded = true;
      return createJsonResponse_({ success: true, applicationId: appId, enquiryId: appId });
    }
    if (!payload.name || !/^[6-9]\d{9}$/.test(payload.whatsapp || '')) throw new Error('Invalid applicant details.');
    if (!config.driveFolderId || typeof payload.resumeBase64 !== 'string' || payload.resumeBase64.length > 4194304) throw new Error('Resume storage is unavailable or the file is too large.');
    var bytes = Utilities.base64Decode(payload.resumeBase64);
    if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error('Resume must be no larger than 3 MB.');
    var filename = String(payload.resumeFileName || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    var signature = bytes.slice(0, 8).map(function (value) { return ('0' + ((value + 256) % 256).toString(16)).slice(-2); }).join('');
    var mime;
    if (/\.pdf$/i.test(filename) && signature.indexOf('255044462d') === 0) mime = 'application/pdf';
    else if (/\.doc$/i.test(filename) && signature === 'd0cf11e0a1b11ae1') mime = 'application/msword';
    else if (/\.docx$/i.test(filename) && signature.indexOf('504b0304') === 0) mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else throw new Error('Resume file contents do not match its type.');
    createdFile = DriveApp.getFolderById(config.driveFolderId).createFile(Utilities.newBlob(bytes, mime, appId + '-' + filename));
    // Explicitly private: access must be granted to authorised HR accounts through Drive.
    createdFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    var resumeUrl = createdFile.getUrl();
    var row = [appId, timestamp, payload.name, payload.whatsapp, payload.email, payload.city, payload.state, payload.qualification, payload.experience, payload.experienceYears, payload.role, filename, resumeUrl, 'New Application', '', '', '', '', payload.requestHash];
    if (!sheet.getRange(1, 19).getValue()) sheet.getRange(1, 19).setValue('Request fingerprint');
    sheet.appendRow(row.map(safeCell_)); recorded = true;
    return createJsonResponse_({ success: true, duplicate: false, applicationId: appId, resumeName: filename, resumeUrl: resumeUrl });
  } catch (error) {
    // Do not expose spreadsheet IDs, folder IDs, tokens, candidate data or upstream exception text.
    return createJsonResponse_({ success: false, error: 'The submission could not be confirmed. Please retry or contact the team.' });
  } finally {
    if (createdFile && !recorded) { try { createdFile.setTrashed(true); } catch (ignored) {} }
    if (locked) { try { lock.releaseLock(); } catch (ignored) {} }
  }
}

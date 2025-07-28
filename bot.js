require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const data = require('./data.js');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function sendFile(fileBuffer, fileName, mimetype, caption = '', folderId = 1) {
  try {
    const formData = new FormData();
    formData.append('chat_id', process.env.CHANNEL_ID);
    formData.append('caption', caption || fileName);
    formData.append('document', fileBuffer, { filename: fileName });
    
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, { headers: formData.getHeaders() });

    if (res.data.ok) {
        const result = res.data.result;
        const fileData = result.document || result.video || result.audio || result.photo;

        if (fileData && fileData.file_id) {
            // 这是确保新档案能撷取到 thumb_file_id 的关键
            await data.addFile({
              fileName,
              mimetype: fileData.mime_type || mimetype,
              message_id: result.message_id,
              file_id: fileData.file_id,
              thumb_file_id: fileData.thumb ? fileData.thumb.file_id : null,
              date: Date.now(),
            }, folderId);
            return { success: true, data: res.data };
        }
    }
    return { success: false, error: res.data };
  } catch (error) {
    const errorDescription = error.response ? (error.response.data.description || JSON.stringify(error.response.data)) : error.message;
    return { success: false, error: { description: errorDescription }};
  }
}

async function deleteMessages(messageIds) {
    const results = { success: [], failure: [] };
    if (!Array.isArray(messageIds) || messageIds.length === 0) return results;

    for (const messageId of messageIds) {
        try {
            const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
                chat_id: process.env.CHANNEL_ID,
                message_id: messageId,
            });
            if (res.data.ok || (res.data.description && res.data.description.includes("message to delete not found"))) {
                results.success.push(messageId);
            } else {
                results.failure.push({ id: messageId, reason: res.data.description });
            }
        } catch (error) {
            const reason = error.response ? error.response.data.description : error.message;
            if (reason.includes("message to delete not found")) {
                results.success.push(messageId);
            } else {
                results.failure.push({ id: messageId, reason });
            }
        }
    }

    if (results.success.length > 0) {
        await data.deleteFilesByIds(results.success);
    }
    
    return results;
}

async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') return null;
  const cleaned_file_id = file_id.trim();
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: cleaned_file_id } });
    if (response.data.ok) return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
  } catch (error) { console.error("获取文件链接失败:", error.response?.data?.description || error.message); }
  return null;
}

module.exports = { sendFile, deleteMessages, getFileLink };

// src/utils/bulkDownload.js - Utilidades de descarga masiva (universal, sin dependencias backend)
export const downloadHTML = (htmlContent, filename) => {
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing

// PDF रीडर फंक्शन का अपडेटेड वर्जन
async function readPdfFile() {
    let filePath = elements.filePath.value.trim();
    
    if (!filePath) {
        filePath = DEFAULT_PDF;
        elements.filePath.value = filePath;
    }

    showLoading(true);
    clearDisplays();

    try {
        const headResponse = await fetch(filePath, { method: 'HEAD' });
        if (!headResponse.ok) {
            throw new Error(`set-a.pdf नहीं मिली`);
        }

        const pdfResponse = await fetch(filePath);
        if (!pdfResponse.ok) throw new Error('PDF डाउनलोड नहीं हो सका');
        
        const pdfBlob = await pdfResponse.blob();
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // PDF व्यू में दिखाएँ
        elements.pdfViewer.src = blobUrl;
        
        // PDF टैब पर ऑटो-स्विच करें
        switchTab('pdf');  // ← यह महत्वपूर्ण है
        
        // टेक्स्ट एक्सट्रैक्शन (बैकग्राउंड में)
        extractTextFromPdf(pdfBlob).then(text => {
            elements.textPreview.textContent = text || '(कोई टेक्स्ट नहीं)';
        }).catch(err => {
            elements.textPreview.textContent = 'टेक्स्ट एक्सट्रैक्शन विफल';
        });

        showRawPreview(pdfBlob);

    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
}
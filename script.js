// PDF Reader Module
const pdfReader = (function() {
    // Set the worker location for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    // State
    let currentTab = 'pdf';

    // DOM Elements
    const elements = {
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        pdfViewer: document.getElementById('pdfViewer'),
        textPreview: document.getElementById('textPreview'),
        rawPreview: document.getElementById('rawPreview'),
        pdfContent: document.getElementById('pdfContent'),
        textContent: document.getElementById('textContent'),
        rawContent: document.getElementById('rawContent'),
        filePath: document.getElementById('filePath'),
        tabs: document.querySelectorAll('.tab')
    };

    // Helper Functions
    function showLoading(show) {
        elements.loading.classList.toggle('active', show);
    }

    function showError(message) {
        elements.error.textContent = '❌ ' + message;
        elements.error.classList.add('active');
        setTimeout(() => elements.error.classList.remove('active'), 6000);
    }

    function clearDisplays() {
        elements.textPreview.textContent = 'टेक्स्ट निकाला जा रहा है...';
        elements.rawPreview.textContent = 'रॉ डेटा लोड हो रहा है...';
    }

    function resetIframe() {
        elements.pdfViewer.src = 'about:blank';
    }

    // Tab switching
    function switchTab(tab) {
        currentTab = tab;
        
        // Update tab styles
        elements.tabs.forEach(t => t.classList.remove('active'));
        if (tab === 'pdf') elements.tabs[0].classList.add('active');
        else if (tab === 'text') elements.tabs[1].classList.add('active');
        else if (tab === 'raw') elements.tabs[2].classList.add('active');
        
        // Show/hide content
        elements.pdfContent.style.display = tab === 'pdf' ? 'block' : 'none';
        elements.textContent.style.display = tab === 'text' ? 'block' : 'none';
        elements.rawContent.style.display = tab === 'raw' ? 'block' : 'none';
    }

    // Extract text using PDF.js
    async function extractTextFromPdf(pdfBlob) {
        try {
            const arrayBuffer = await pdfBlob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            return fullText.trim() || 'PDF में कोई टेक्स्ट नहीं मिला (यह स्कैन की गई छवि हो सकती है)';
        } catch (error) {
            console.warn('PDF.js extraction error:', error);
            throw new Error('PDF.js टेक्स्ट नहीं निकाल सका');
        }
    }

    // Show raw preview (first 800 bytes as text + hex)
    async function showRawPreview(blob) {
        try {
            const arrayBuffer = await blob.slice(0, 800).arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let hexPart = '';
            let textPart = '';
            
            for (let i = 0; i < bytes.length; i++) {
                hexPart += bytes[i].toString(16).padStart(2, '0') + ' ';
                if ((i + 1) % 16 === 0) hexPart += '\n';
                
                const char = bytes[i];
                if (char >= 32 && char <= 126) textPart += String.fromCharCode(char);
                else textPart += '.';
            }
            
            const preview = `बाइनरी डेटा का प्रारंभ (पहले 800 बाइट्स):\n\nहेक्स डंप:\n${hexPart}\n\nASCII प्रतिनिधित्व:\n${textPart}`;
            elements.rawPreview.textContent = preview;
        } catch (e) {
            elements.rawPreview.textContent = 'रॉ प्रीव्यू नहीं दिखा सकते: ' + e.message;
        }
    }

    // Main function to read PDF file from server
    async function readPdfFile() {
        const filePath = elements.filePath.value.trim();
        
        if (!filePath) {
            showError('कृपया PDF फ़ाइल का पथ दर्ज करें');
            return;
        }

        // If it's a demo call, load demo instead
        if (filePath.toLowerCase().includes('demo') || filePath === 'sample.pdf') {
            loadDemoPdf();
            return;
        }

        showLoading(true);
        clearDisplays();

        try {
            // Check if file exists and is accessible
            const headResponse = await fetch(filePath, { method: 'HEAD' });
            if (!headResponse.ok) {
                throw new Error('फ़ाइल नहीं मिली या एक्सेस नहीं है (404)');
            }

            const contentType = headResponse.headers.get('content-type') || '';
            if (!contentType.includes('pdf') && !filePath.toLowerCase().endsWith('.pdf')) {
                console.warn('फ़ाइल PDF नहीं लगती, फिर भी कोशिश कर रहे हैं');
            }

            // Fetch the PDF
            const pdfResponse = await fetch(filePath);
            if (!pdfResponse.ok) throw new Error('PDF डाउनलोड नहीं हो सका');
            
            const pdfBlob = await pdfResponse.blob();
            const blobUrl = URL.createObjectURL(pdfBlob);
            
            // Set PDF view
            elements.pdfViewer.src = blobUrl;
            
            // Try to extract text for other tabs
            extractTextFromPdf(pdfBlob).then(text => {
                elements.textPreview.textContent = text || '(कोई टेक्स्ट नहीं निकाला जा सका)';
            }).catch(err => {
                elements.textPreview.textContent = 'टेक्स्ट एक्सट्रैक्शन विफल: ' + err.message;
            });

            // Show raw preview
            showRawPreview(pdfBlob);

        } catch (error) {
            console.error(error);
            showError('PDF पढ़ने में त्रुटि: ' + error.message);
            
            // Fallback: show demo content if it's a demo-ish name
            if (filePath.includes('demo') || filePath === 'sample.pdf') {
                loadDemoPdf();
            } else {
                resetIframe();
            }
        } finally {
            showLoading(false);
        }
    }

    // Load demo PDF
    function loadDemoPdf() {
        showLoading(true);
        clearDisplays();
        
        const demoPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        
        fetch(demoPdfUrl)
            .then(res => {
                if (!res.ok) throw new Error('डेमो PDF उपलब्ध नहीं');
                return res.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                elements.pdfViewer.src = blobUrl;
                
                // Extract text from dummy PDF
                extractTextFromPdf(blob).then(text => {
                    elements.textPreview.textContent = text || '(डेमो PDF में टेक्स्ट नहीं)';
                }).catch(() => {
                    elements.textPreview.textContent = 'डेमो PDF से टेक्स्ट नहीं निकाल सके।';
                });
                
                showRawPreview(blob);
                showLoading(false);
            })
            .catch(err => {
                console.warn('डेमो PDF लोड नहीं हुआ, इनलाइन मैसेज दिखा रहे हैं।');
                
                // Fallback: display message in iframe
                const fallbackHtml = `
                    <html><body style="font-family:sans-serif;padding:2rem;">
                    <h2>📄 डेमो PDF (सिम्युलेटेड)</h2>
                    <p>यह एक डेमो PDF फ़ाइल है। असली PDF देखने के लिए कृपया सही सर्वर पथ दें।</p>
                    <p>आप किसी भी PDF का पथ ऊपर दे सकते हैं, जैसे: <code>/uploads/report.pdf</code></p>
                    <hr>
                    <p><b>नमूना सामग्री:</b> यह PDF रीडर सर्वर फ़ोल्डर से फ़ाइलें पढ़ सकता है।</p>
                    </body></html>
                `;
                const blob = new Blob([fallbackHtml], { type: 'text/html' });
                elements.pdfViewer.src = URL.createObjectURL(blob);
                
                elements.textPreview.textContent = 'यह डेमो PDF है। असली PDF से टेक्स्ट लाने के लिए सही फ़ाइल पथ डालें।';
                elements.rawPreview.textContent = 'डेमो PDF रॉ डेटा (सिम्युलेटेड)';
                showLoading(false);
            });
    }

    // Initialize event listeners
    function init() {
        // Set up tab click listeners
        elements.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                const tabName = index === 0 ? 'pdf' : (index === 1 ? 'text' : 'raw');
                switchTab(tabName);
            });
        });

        // Enter key on file input
        elements.filePath.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') readPdfFile();
        });

        // Initial iframe state
        elements.pdfViewer.src = 'about:blank';

        // Check server connectivity
        fetch(window.location.origin, { method: 'HEAD' })
            .then(() => console.log('सर्वर से कनेक्शन ठीक है'))
            .catch(() => showError('सर्वर से कनेक्ट नहीं हो पा रहा, लेकिन आप डेमो देख सकते हैं।'));
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        switchTab,
        readPdfFile,
        loadDemoPdf
    };
})();

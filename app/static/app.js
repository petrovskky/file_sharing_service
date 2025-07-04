document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressText = document.getElementById('progressText');
    const errorContainer = document.getElementById('errorContainer');
    const resultContainer = document.getElementById('resultContainer');
    const downloadLink = document.getElementById('downloadLink');
    const copyBtn = document.getElementById('copyBtn');
    const copySuccess = document.getElementById('copySuccess');
    const cancelBtn = document.getElementById('cancelBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileList = document.getElementById('fileList');

    const allowedMimeTypes = [
        "application/pdf",
        "text/plain",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "audio/mpeg",
        "video/mp4",
        "application/zip",
        "application/x-tar",
        "application/gzip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    let currentXHR = null;
    let selectedFiles = [];
    const MAX_FILES = 5;
    const MAX_TOTAL_SIZE = 500 * 1024 * 1024;

    function initializeEventListeners() {
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone || e.target.closest('#browseBtn')) {
                fileInput.click();
            }
        });

        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            handleFileSelect(Array.from(e.target.files));
        });

        cancelBtn.addEventListener('click', cancelUpload);
        copyBtn.addEventListener('click', copyToClipboard);
        uploadBtn.addEventListener('click', createZipAndUpload);

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            handleFileSelect(Array.from(e.dataTransfer.files));
        }, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleFileSelect(files) {
        hideError();
        resetResultUI();

        if (files.length === 0) return;

        if (selectedFiles.length + files.length > MAX_FILES) {
            showError(`<i class="fas fa-exclamation-triangle"></i> Maximum ${MAX_FILES} files allowed`);
            return;
        }

        let totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        let newTotalSize = totalSize;

        for (const file of files) {
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }

            if (file.size > 100 * 1024 * 1024) {
                showError(`<i class="fas fa-exclamation-triangle"></i> File "${file.name}" is too large. Maximum size: 100MB`);
                continue;
            }

            if (!allowedMimeTypes.includes(file.type)) {
                showError(`<i class="fas fa-exclamation-triangle"></i> Unsupported file type for "${file.name}": ${file.type}`);
                continue;
            }

            newTotalSize += file.size;
            if (newTotalSize > MAX_TOTAL_SIZE) {
                showError(`<i class="fas fa-exclamation-triangle"></i> Total files size exceeds 500MB limit`);
                return;
            }

            selectedFiles.push(file);
            addFileToList(file);
        }

        fileInput.value = '';

        if (selectedFiles.length > 0) {
            uploadBtn.classList.remove('hidden');
        }
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function getFileIconClass(mimeType) {
        if (mimeType.startsWith('image/')) return 'fa-file-image';
        if (mimeType.startsWith('video/')) return 'fa-file-video';
        if (mimeType.startsWith('audio/')) return 'fa-file-audio';
        if (mimeType.includes('pdf')) return 'fa-file-pdf';
        if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'fa-file-archive';
        if (mimeType.includes('word') || mimeType.includes('doc')) return 'fa-file-word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fa-file-excel';
        if (mimeType.includes('text/')) return 'fa-file-alt';
        return 'fa-file';
    }

    function addFileToList(file) {
        fileList.style.display = 'block';

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const iconClass = getFileIconClass(file.type);
        const fileSize = formatFileSize(file.size);

        fileItem.innerHTML = `
            <div class="file-info-item">
                <i class="fas ${iconClass}"></i>
                <span>${file.name} (${fileSize})</span>
            </div>
            <div class="file-actions">
                <button class="remove-btn" data-file="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        fileList.appendChild(fileItem);

        fileItem.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(file);
        });
    }

    function removeFile(fileToRemove) {
        selectedFiles = selectedFiles.filter(file => file !== fileToRemove);

        fileList.innerHTML = '';
        selectedFiles.forEach(file => addFileToList(file));

        if (selectedFiles.length === 0) {
            fileList.style.display = 'none';
            uploadBtn.classList.add('hidden');
        }
    }

    async function createZipAndUpload() {
        if (selectedFiles.length === 0) return;

        hideError();
        resetUI();

        progressContainer.classList.remove('hidden');
        uploadProgress.style.width = '0%';

        try {
            progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating ZIP archive (0/${selectedFiles.length} files added)...`;

            const zip = new JSZip();
            let filesAdded = 0;

            for (const file of selectedFiles) {
                zip.file(file.name, file);
                filesAdded++;
                progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating ZIP archive (${filesAdded}/${selectedFiles.length} files added)...`;

                await new Promise(resolve => setTimeout(resolve, 10));
            }

            progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Compressing ZIP archive...`;

            const zipBlob = await zip.generateAsync(
                { type: "blob", compression: "DEFLATE" },
                metadata => {
                    const progress = Math.round(metadata.percent);
                    uploadProgress.style.width = `${progress}%`;
                    progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Compressing: ${progress}%`;
                }
            );

            const zipFile = new File([zipBlob], "archive.zip", {
                type: "application/zip",
                lastModified: Date.now()
            });

            progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ZIP archive...`;
            uploadProgress.style.width = '0%';

            await uploadFile(zipFile);

        } catch (error) {
            console.error('ZIP creation error:', error);
            showError(`<i class="fas fa-exclamation-triangle"></i> Error creating ZIP archive: ${error.message}`);
            progressContainer.classList.add('hidden');
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = await grecaptcha.execute('6LeGdXUrAAAAAPB5RK_bW96wACdqV7VFQB_cY7zZ', {action: 'upload'});
            formData.append('recaptcha_token', token);

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                currentXHR = xhr;

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        uploadProgress.style.width = `${percent}%`;
                        progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading: ${percent}%`;
                    }
                });

                xhr.addEventListener('load', () => {
                    currentXHR = null;
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            showResult(response.s3_key);
                            resolve();
                        } catch (e) {
                            showError('<i class="fas fa-exclamation-triangle"></i> Error processing server response');
                            reject();
                        }
                    } else {
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            showError(`<i class="fas fa-exclamation-triangle"></i> ${errorResponse.detail || 'File upload error'}`);
                            reject();
                        } catch {
                            showError(`<i class="fas fa-exclamation-triangle"></i> Error ${xhr.status}: ${xhr.statusText}`);
                            reject();
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    currentXHR = null;
                    showError('<i class="fas fa-wifi-slash"></i> Network error. Check your internet connection');
                    reject();
                });

                xhr.addEventListener('abort', () => {
                    progressContainer.classList.add('hidden');
                    currentXHR = null;
                    showToast('<i class="fas fa-info-circle"></i> Upload canceled');
                    reject();
                });

                xhr.open('POST', '/api/v1/upload', true);
                xhr.send(formData);
            });
        } catch (error) {
            showError('<i class="fas fa-exclamation-triangle"></i> Error preparing upload');
            console.error('Upload preparation error:', error);
        }
    }

    function cancelUpload() {
        if (currentXHR) {
            currentXHR.abort();
        }
        progressContainer.classList.add('hidden');
    }

    function showResult(s3Key) {
        const downloadUrl = `https://app.nonstudents.online/api/v1/download/${s3Key}`;
        downloadLink.value = downloadUrl;
        resultContainer.classList.remove('hidden');
        progressContainer.classList.add('hidden');

        if (selectedFiles.length > 0) {
            const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
            fileInfo.innerHTML = `
                <i class="fas fa-file-archive"></i>
                archive.zip (${formatFileSize(totalSize)})
                containing ${selectedFiles.length} files
            `;
        }

        downloadLink.classList.add('pulse');
        setTimeout(() => downloadLink.classList.remove('pulse'), 3000);

        selectedFiles = [];
        fileList.innerHTML = '';
        fileList.style.display = 'none';
        uploadBtn.classList.add('hidden');
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(downloadLink.value);
            copySuccess.classList.remove('hidden');
            setTimeout(() => {
                copySuccess.classList.add('hidden');
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            downloadLink.select();
            document.execCommand('copy');
            showToast('<i class="fas fa-check"></i> Link copied to clipboard');
        }
    }

    function showError(message) {
        errorContainer.innerHTML = message;
        errorContainer.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }

    function hideError() {
        errorContainer.classList.add('hidden');
        errorContainer.innerHTML = '';
    }

    function resetResultUI() {
        resultContainer.classList.add('hidden');
        fileInfo.innerHTML = '';
        downloadLink.value = '';
        copySuccess.classList.add('hidden');
    }

    function resetUI() {
        resetResultUI();
        errorContainer.classList.add('hidden');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    initializeEventListeners();
});

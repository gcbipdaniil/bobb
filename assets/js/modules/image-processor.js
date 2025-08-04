async function processImage(file, options = {}) {
    const { maxWidth = 1280, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onerror = reject;

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onerror = reject;

            img.onload = () => {
                const scaleRatio = maxWidth / img.width;
                const newWidth = img.width > maxWidth ? maxWidth : img.width;
                const newHeight = img.width > maxWidth ? img.height * scaleRatio : img.height;

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return reject(new Error('Не удалось создать Blob из canvas.'));
                        }

                        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        const newFile = new File([blob], newFileName, { type: 'image/webp' });
                        resolve(newFile);
                    },
                    'image/webp',
                    quality
                );
            };
        };
    });
}
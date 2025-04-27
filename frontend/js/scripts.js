document.addEventListener('DOMContentLoaded', () => {
    // Verifica se um arquivo foi selecionado, habilita o botão e exibe o nome do arquivo
    document.getElementById('romFile').addEventListener('change', (event) => {
        const processButton = document.getElementById('processButton');
        const fileNameLabel = document.getElementById('fileName');

        if (event.target.files && event.target.files.length > 0) {
            processButton.disabled = false;
            fileNameLabel.innerText = event.target.files[0].name;
            fileNameLabel.classList.remove('no-file');
            fileNameLabel.classList.add('file-selected');
        } else {
            processButton.disabled = true;
            fileNameLabel.innerText = 'Nenhum arquivo selecionado!';
            fileNameLabel.classList.remove('file-selected');
            fileNameLabel.classList.add('no-file');
        }
    });

    // Processa o arquivo quando o botão é clicado
    document.getElementById('processButton').addEventListener('click', async () => {
        const file = document.getElementById('romFile').files[0];
        if (!file) return;

        // Limpa resultados anteriores
        document.getElementById('result').innerHTML = '';
        document.getElementById('error').innerText = '';
        document.getElementById('error').style.display = 'none';

        // Mostra o loading e esconde o botão de copiar
        const loadingDiv = document.getElementById('loading');
        const buttonContainer = document.querySelector('.button-container');
        const existingButton = document.getElementById('copyButton');
        
        if (existingButton) {
            existingButton.style.display = 'none'; // Esconde o botão de copiar
        }
        
        loadingDiv.style.display = 'block';

        try {
            // Calcula os hashes
            const hashes = await calculateHashesInChunks(file);

            // Exibe os hashes na tela no formato desejado
            const resultHtml = `
                <p class="details">Hash SHA-1: <o class="detailsResult" id="hashSHA1">${hashes.sha1}</o></p>
                <p class="details">Hash MD5: <o class="detailsResult">${hashes.md5}</o></p>
                <p class="details">Hash CRC32: <o class="detailsResult">${hashes.crc}</o></p>
            `;

            document.getElementById('result').innerHTML = resultHtml;

            // Limpa o botão de copiar anterior, caso exista
            if (existingButton) {
                buttonContainer.removeChild(existingButton);
            }

            // Cria o botão dinamicamente
            const copyButton = document.createElement('button');
            copyButton.id = 'copyButton';
            copyButton.innerText = 'Copiar SHA-1';

            // Adiciona o botão ao contêiner
            buttonContainer.appendChild(copyButton);

            // Função de copiar apenas o SHA-1 para a área de transferência
            const hashSHA1 = document.getElementById('hashSHA1').innerText;

            // Evento de clique para copiar o SHA-1
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(hashSHA1).then(() => {
                    // Mudando a cor do botão para verde após a cópia
                    copyButton.classList.add('copied');
                    copyButton.innerText = 'SHA-1 Copiado!';
            
                    // Reverter o estilo após 2 segundos
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyButton.innerText = 'Copiar SHA-1';
                    }, 2000);
                });
            });

        } catch (error) {
            document.getElementById('error').innerText = `Erro: ${error.message}`;
            document.getElementById('error').style.display = 'block';
        } finally {
            // Esconde o loading e exibe o botão de copiar novamente
            loadingDiv.style.display = 'none';
            copyButton.style.display = 'block'; // Torna o botão de copiar visível
        }
    });

    // Função para calcular hashes em chunks (assíncrona)
    async function calculateHashesInChunks(file) {
        const chunkSize = 1024 * 1024 * 10; // 10 MB por chunk
        let sha1 = CryptoJS.algo.SHA1.create();
        let md5 = CryptoJS.algo.MD5.create();
        let crc = 0xFFFFFFFF;
        let offset = 0;

        const progressBarInner = document.querySelector('.progress-bar-inner');
        progressBarInner.style.width = '0%';

        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            const chunkArrayBuffer = await readChunkAsArrayBuffer(chunk);
            const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(chunkArrayBuffer));

            sha1.update(wordArray);
            md5.update(wordArray);
            crc = calculateCRC32(chunkArrayBuffer, crc);

            offset += chunkSize;

            const progress = Math.min((offset / file.size) * 100, 100);
            progressBarInner.style.width = `${progress}%`;

            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        crc = (crc ^ 0xFFFFFFFF) >>> 0;

        return {
            sha1: sha1.finalize().toString(CryptoJS.enc.Hex),
            md5: md5.finalize().toString(CryptoJS.enc.Hex),
            crc: crc.toString(16).padStart(8, '0'),
        };
    }

    function calculateCRC32(arrayBuffer, crc = 0xFFFFFFFF) {
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < uint8Array.length; i++) {
            crc ^= uint8Array[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return crc;
    }

    function readChunkAsArrayBuffer(chunk) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Falha ao ler o chunk.'));
            reader.readAsArrayBuffer(chunk);
        });
    }
});

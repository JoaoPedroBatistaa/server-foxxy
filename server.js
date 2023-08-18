const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client } = require('ssh2');
const archiver = require('archiver');

const app = express();
app.use(cors());
const port = 3001;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array('files', 10); // Permite até 10 arquivos. Ajuste conforme necessário.

app.get('/', (req, res) => {
    res.send('Servidor em funcionamento! Use o endpoint /upload para enviar arquivos.');
});


app.post('/upload', upload, (req, res) => {
    const { files } = req;
    if (!files || files.length === 0) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }

    const conn = new Client();

    conn.on('error', (err) => {
        console.error("Erro ao conectar via SSH:", err.message);
        res.status(500).send('Erro ao conectar via SSH.');
    });

    conn.on('ready', () => {
        conn.sftp(async (err, sftp) => {
            if (err) throw err;

            // Se apenas um arquivo, envie-o diretamente
            if (files.length === 1) {
                const remotePath = '/path/to/your/server/directory/' + files[0].originalname;
                sftp.writeFile(remotePath, files[0].buffer, (err) => {
                    if (err) {
                        console.error('Erro ao enviar o arquivo:', err);
                        res.status(500).send('Erro ao enviar o arquivo.');
                    } else {
                        res.send('Arquivo enviado com sucesso.');
                    }
                    conn.end();
                });
            } else {
                // Se vários arquivos, compacte-os primeiro
                const archive = archiver('zip');
                files.forEach(file => {
                    archive.append(file.buffer, { name: file.originalname });
                });

                const remotePath = '/path/to/your/server/directory/archive.zip';
                const writeStream = sftp.createWriteStream(remotePath);

                writeStream.on('close', () => {
                    console.log('Arquivos compactados enviados com sucesso!');
                    res.send('Arquivos enviados com sucesso.');
                    conn.end();
                });

                archive.pipe(writeStream);
                archive.finalize();
            }
        });
    }).connect({
        host: '177.73.233.37', 
        port: 22,
        username: 'ianuvem',
        password: '6DLh2M.S76n-wp'
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});


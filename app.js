const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const archiver = require('archiver');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Разбор тела запроса
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Отдача статических файлов из папки проекта
app.use(express.static(__dirname));

// Маршрут для отображения формы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Маршрут для генерации HTML-страницы
app.post('/generate', (req, res) => {
    const formData = req.body;
    const selectedTemplate = formData.template;

    // Чтение выбранного шаблона из файла
    fs.readFile(`templates/${selectedTemplate}.html`, 'utf8', (err, template) => {
        if (err) {
            console.error('Ошибка при чтении шаблона:', err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            return;
        }

        // Замена плейсхолдеров на значения из формы
        let html = template;
        for (const key in formData) {
            if (key !== 'template') {
                const value = formData[key];
                const placeholder = `{{${key}}}`;
                html = html.replace(new RegExp(placeholder, 'g'), value);
            }
        }

        // Запись сгенерированного HTML в файл index.html в папке сайта
        const siteFolder = 'site';
        const indexFile = path.join(siteFolder, 'index.html');
        fs.writeFile(indexFile, html, (err) => {
            if (err) {
                console.error('Ошибка при записи файла:', err);
                res.status(500).json({ error: 'Внутренняя ошибка сервера' });
                return;
            }

            // Создание архива сайта
            const archiveName = 'site.zip';
            const output = fs.createWriteStream(archiveName);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log('Архив сайта создан');
                res.json({ archiveName });
            });

            archive.on('error', (err) => {
                console.error('Ошибка при создании архива:', err);
                res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            });

            archive.pipe(output);
            archive.directory(siteFolder, false);
            archive.finalize();
        });
    });
});

// Маршрут для получения списка файлов
app.get('/files', (req, res) => {
    const siteFolder = 'site';
    fs.readdir(siteFolder, (err, files) => {
        if (err) {
            console.error('Ошибка при чтении папки сайта:', err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            return;
        }
        res.json(files);
    });
});

// Маршрут для загрузки файлов
app.post('/upload', upload.array('file'), (req, res) => {
    const siteFolder = 'site';
    const files = req.files;

    files.forEach((file) => {
        const oldPath = file.path;
        const newPath = path.join(siteFolder, file.originalname);

        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Ошибка при перемещении файла:', err);
            }
        });
    });

    res.json({ success: true });
});

// Маршрут для удаления файла
app.delete('/delete/:file', (req, res) => {
    const fileName = req.params.file;
    const filePath = path.join('site', fileName);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Ошибка при удалении файла:', err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            return;
        }
        res.json({ success: true });
    });
});

// Маршрут для скачивания сгенерированного файла
app.get('/download/index.html', (req, res) => {
    const filePath = path.join(__dirname, 'site', 'index.html');
    res.download(filePath, 'index.html', (err) => {
        if (err) {
            console.error('Ошибка при скачивании файла:', err);
            res.status(500).send('Внутренняя ошибка сервера');
        }
    });
});

// Маршрут для получения конфигурации основных переменных шаблона
app.get('/templates/:template', (req, res) => {
    const template = req.params.template;
    const templateFile = path.join(__dirname, 'templates', `${template}.json`);
    res.sendFile(templateFile);
});

// Запуск сервера
app.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});
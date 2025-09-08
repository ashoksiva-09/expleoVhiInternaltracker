// Add request logging middleware at the top
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;  

const initDb = () => {
    return new Promise((resolve, reject) => {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');

        // Create or open database
        const dbPath = path.join(__dirname, 'vhi-dashboard.db');
        const db = new sqlite3.Database(dbPath);

        // Create tables
        db.serialize(() => {
            // Resources table
            db.run(`CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empId TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Resource columns table (for dynamic columns)
            db.run(`CREATE TABLE IF NOT EXISTS resource_columns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Resource data table (for custom column values)
            db.run(`CREATE TABLE IF NOT EXISTS resource_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_id INTEGER,
                column_name TEXT,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_id) REFERENCES resources (id),
                UNIQUE(resource_id, column_name)
            )`);

            // Leaves table
            db.run(`CREATE TABLE IF NOT EXISTS leaves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                resource TEXT NOT NULL,
                type TEXT NOT NULL,
                hours INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Timesheet table
            db.run(`CREATE TABLE IF NOT EXISTS timesheet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emp_id TEXT NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                week INTEGER,
                whizible TEXT DEFAULT '',
                changepoint TEXT DEFAULT '',
                planview TEXT DEFAULT '',
                comments TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (emp_id) REFERENCES resources (empId),
                UNIQUE(emp_id, year, month, week)
            )`);

            // Trainings table
            db.run(`CREATE TABLE IF NOT EXISTS trainings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empId TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                course_name TEXT,
                description TEXT,
                start_date TEXT NOT NULL,
                end_date TEXT,
                hours INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empId) REFERENCES resources (empId)
            )`);

            // Learnings table
            db.run(`CREATE TABLE IF NOT EXISTS learnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empId TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                description TEXT,
                date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empId) REFERENCES resources (empId)
            )`);

            console.log('Database tables created successfully');

            // Insert initial hardcoded resources from index.html
            const initialResources = [
                { empId: 'ES5602', name: 'Manikannan Pandian' },
                { empId: 'TG5000', name: 'Hanitha Mathivanan' },
                { empId: 'TG3717', name: 'Nino Bertina Cardoza' },
                { empId: 'TG3530', name: 'Subrahmanya Sai Chakrapani Kappagantula' },
                { empId: 'TG3865', name: 'Harini Priyanka Ashok' },
                { empId: 'TG3584', name: 'Sindiya Kandasamy' },
                { empId: 'ES5587', name: 'Sudharsna Kumar' },
                { empId: 'TG5022', name: 'Akila Selvaraju' },
                { empId: 'ES6190', name: 'Lakshmi Priya Sukumar' },
                { empId: 'TG4217', name: 'Premaruby Mahalingam' },
                { empId: 'TG4031', name: 'Kavin Radhakrishnan' },
                { empId: 'ES5886', name: 'Anitha T' },
                { empId: '50100758', name: 'Arunkumar Palanisamy' },
                { empId: 'TG2255', name: 'Soundhar Chandrasekaran' },
                { empId: 'TG5113', name: 'Sathish Kumar Viswanathan' },
                { empId: 'TG4082', name: 'Ashok Kumar Sivakumar' },
                { empId: 'TG0670', name: 'Gurumoorthi Ganesan' },
                { empId: 'TG4972', name: 'Sairaj Raju' },
                { empId: 'ES5703', name: 'Pavithra Jawahar' },
                { empId: 'TG3508', name: 'Selvi Raja' },
                { empId: 'TG5038', name: 'Jaganathan Sabapathy' },
                { empId: 'TG4024', name: 'Anish Pankiraj' },
                { empId: 'ES5868', name: 'Madhan Jayaraman' },
                { empId: 'ES6407', name: 'Surya C Chandrasekaran' },
                { empId: 'TG2740', name: 'Santhosh K' },
                { empId: 'ES5133', name: 'Shipra Chandrakant Ballewar' },
                { empId: 'TG2631', name: 'Thamaraichandiran Arulalagan' },
                { empId: 'ES5744', name: 'Janani Tirumalaisamy' }
            ];

            const insertStmt = db.prepare('INSERT OR IGNORE INTO resources (empId, name) VALUES (?, ?)');
            initialResources.forEach(resource => {
                insertStmt.run(resource.empId, resource.name);
            });
            insertStmt.finalize();

            console.log('Initial resources inserted');
            resolve();
        });
        db.close();
    });
};

app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(bodyParser.json());

const dbPath = path.join(__dirname, 'vhi-dashboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Simple test route
app.get('/api/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'API is working!' });
});

// Get all resources
app.get('/api/resources', (req, res) => {
    console.log('GET /api/resources request received');
    
    db.all('SELECT * FROM resources ORDER BY name', (err, resources) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Found ${resources.length} resources`);
        res.json({ resources: resources, columns: [] });
    });
});

// Get all leave entries
app.get('/api/leaves', (req, res) => {
    console.log('GET /api/leaves request received');
    
    db.all('SELECT * FROM leaves ORDER BY date', (err, leaves) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Found ${leaves.length} leave entries`);
        res.json(leaves);
    });
});

// Add new leave entry
app.post('/api/leaves', (req, res) => {
    console.log('POST /api/leaves request received:', req.body);
    
    const { date, resource, type, hours } = req.body;
    
    db.run('INSERT INTO leaves (date, resource, type, hours) VALUES (?, ?, ?, ?)', 
        [date, resource, type, hours], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Leave entry added with ID: ${this.lastID}`);
        res.json({ id: this.lastID, date, resource, type, hours });
    });
});

// Update leave entry
app.put('/api/leaves/:id', (req, res) => {
    const { id } = req.params;
    const { date, resource, type, hours } = req.body;
    
    console.log(`PUT /api/leaves/${id} request received:`, req.body);
    
    db.run('UPDATE leaves SET date = ?, resource = ?, type = ?, hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [date, resource, type, hours, id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Leave entry ${id} updated successfully`);
        res.json({ message: 'Leave entry updated successfully' });
    });
});

// Delete leave entry
app.delete('/api/leaves/:id', (req, res) => {
    const { id } = req.params;
    
    console.log(`DELETE /api/leaves/${id} request received`);
    
    db.run('DELETE FROM leaves WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Leave entry ${id} deleted successfully`);
        res.json({ message: 'Leave entry deleted successfully' });
    });
});

// Update resource entry
app.put('/api/resources/:empId', (req, res) => {
    const { empId } = req.params;
    const { name } = req.body;

    console.log(`PUT /api/resources/${empId} request received:`, req.body);
    console.log(`Updating resource with empId: ${empId} to name: ${name}`);

    db.run('UPDATE resources SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE empId = ?', 
        [name, empId], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        console.log(`Resource ${empId} updated successfully`);
        res.json({ message: 'Resource updated successfully' });
    });
});

// Delete resource entry
app.delete('/api/resources/:id', (req, res) => {
    const { id } = req.params;

    console.log(`DELETE /api/resources/${id} request received`);

    db.run('DELETE FROM resources WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        console.log(`Resource ${id} deleted successfully`);
        res.json({ message: 'Resource deleted successfully' });
    });
});

// Add new resource
app.post('/api/resources', (req, res) => {
    console.log('POST /api/resources request received:', req.body);
    
    const { empId, name } = req.body;
    
    db.run('INSERT INTO resources (empId, name) VALUES (?, ?)', 
        [empId, name], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Resource added with ID: ${this.lastID}`);
        res.json({ id: this.lastID, empId, name });
    });
});

// Update resource data (custom columns)
app.post('/api/resources/:resourceId/data', (req, res) => {
    const { resourceId } = req.params;
    const { column_name, value } = req.body;
    
    console.log(`POST /api/resources/${resourceId}/data request received:`, req.body);
    
    db.run(`INSERT INTO resource_data (resource_id, column_name, value) 
            VALUES (?, ?, ?) 
            ON CONFLICT(resource_id, column_name) 
            DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
        [resourceId, column_name, value, value], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Resource data updated for resource ${resourceId}, column ${column_name}`);
        res.json({ message: 'Resource data updated successfully' });
    });
});

// Get columns from database
app.get('/api/columns', (req, res) => {
    console.log('GET /api/columns request received');
    
    db.all('SELECT name FROM resource_columns ORDER BY name', (err, columns) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const columnNames = columns.map(col => col.name);
        console.log(`Found ${columnNames.length} columns`);
        res.json(columnNames);
    });
});

// Get resource by empId
app.get('/api/test-fetch/:empId', (req, res) => {
    const { empId } = req.params;

    db.get('SELECT * FROM resources WHERE empId = ?', [empId], (err, resource) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.json(resource);
    });
});

// Trainings API endpoints

// Get all trainings with optional month filter
app.get('/api/trainings', (req, res) => {
    console.log('GET /api/trainings request received');

    const { month } = req.query;
    let query = 'SELECT * FROM trainings ORDER BY start_date DESC';
    let params = [];

    if (month) {
        query = 'SELECT * FROM trainings WHERE strftime("%m", start_date) = ? ORDER BY start_date DESC';
        params = [month.padStart(2, '0')];
    }

    db.all(query, params, (err, trainings) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${trainings.length} training entries`);
        res.json(trainings);
    });
});

// Add new training entry
app.post('/api/trainings', (req, res) => {
    console.log('POST /api/trainings request received:', req.body);

    const { empId, resource_name, platform, course_name, description, start_date, end_date, hours } = req.body;

    db.run('INSERT INTO trainings (empId, resource_name, platform, course_name, description, start_date, end_date, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [empId, resource_name, platform, course_name, description, start_date, end_date, hours], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Training entry added with ID: ${this.lastID}`);
        res.json({
            id: this.lastID,
            empId,
            resource_name,
            platform,
            course_name,
            description,
            start_date,
            end_date,
            hours
        });
    });
});

// Update training entry
app.put('/api/trainings/:id', (req, res) => {
    const { id } = req.params;
    const { empId, resource_name, platform, course_name, description, start_date, end_date, hours } = req.body;

    console.log(`PUT /api/trainings/${id} request received:`, req.body);

    db.run('UPDATE trainings SET empId = ?, resource_name = ?, platform = ?, course_name = ?, description = ?, start_date = ?, end_date = ?, hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [empId, resource_name, platform, course_name, description, start_date, end_date, hours, id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Training entry not found' });
        }

        console.log(`Training entry ${id} updated successfully`);
        res.json({ message: 'Training entry updated successfully' });
    });
});

// Delete training entry
app.delete('/api/trainings/:id', (req, res) => {
    const { id } = req.params;
    
    console.log(`DELETE /api/trainings/${id} request received`);
    
    db.run('DELETE FROM trainings WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Training entry not found' });
        }
        
        console.log(`Training entry ${id} deleted successfully`);
        res.json({ message: 'Training entry deleted successfully' });
    });
});

// Learnings API endpoints

// Get all learnings with optional month filter
app.get('/api/learnings', (req, res) => {
    console.log('GET /api/learnings request received');
    
    const { month } = req.query;
    let query = 'SELECT * FROM learnings ORDER BY date DESC';
    let params = [];
    
    if (month) {
        query = 'SELECT * FROM learnings WHERE strftime("%m", date) = ? ORDER BY date DESC';
        params = [month.padStart(2, '0')];
    }
    
    db.all(query, params, (err, learnings) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Found ${learnings.length} learning entries`);
        res.json(learnings);
    });
});

// Add new learning entry
app.post('/api/learnings', (req, res) => {
    console.log('POST /api/learnings request received:', req.body);
    
    const { empId, resource_name, platform, description, date } = req.body;
    
    db.run('INSERT INTO learnings (empId, resource_name, platform, description, date) VALUES (?, ?, ?, ?, ?)', 
        [empId, resource_name, platform, description, date], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Learning entry added with ID: ${this.lastID}`);
        res.json({ 
            id: this.lastID, 
            empId, 
            resource_name, 
            platform, 
            description, 
            date 
        });
    });
});

// Update learning entry
app.put('/api/learnings/:id', (req, res) => {
    const { id } = req.params;
    const { empId, resource_name, platform, description, date } = req.body;
    
    console.log(`PUT /api/learnings/${id} request received:`, req.body);
    
    db.run('UPDATE learnings SET empId = ?, resource_name = ?, platform = ?, description = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [empId, resource_name, platform, description, date, id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Learning entry not found' });
        }
        
        console.log(`Learning entry ${id} updated successfully`);
        res.json({ message: 'Learning entry updated successfully' });
    });
});

// Delete learning entry
app.delete('/api/learnings/:id', (req, res) => {
    const { id } = req.params;
    
    console.log(`DELETE /api/learnings/${id} request received`);
    
    db.run('DELETE FROM learnings WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Learning entry not found' });
        }
        
        console.log(`Learning entry ${id} deleted successfully`);
        res.json({ message: 'Learning entry deleted successfully' });
    });
});

// Start the server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Dashboard running at http://localhost:${PORT}/index.html`);
        console.log('API endpoints available at:');
        console.log('  GET /api/test');
        console.log('  GET /api/resources');
        console.log('  POST /api/resources');
        console.log('  PUT /api/resources/:empId');
        console.log('  POST /api/resources/:resourceId/data');
        console.log('  GET /api/columns');
        console.log('  GET /api/trainings');
        console.log('  POST /api/trainings');
        console.log('  PUT /api/trainings/:id');
        console.log('  DELETE /api/trainings/:id');
        console.log('  GET /api/learnings');
        console.log('  POST /api/learnings');
        console.log('  PUT /api/learnings/:id');
        console.log('  DELETE /api/learnings/:id');
    });
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = initDb;

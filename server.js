// Add request logging middleware at the top
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
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
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'vhiuser',
                customMenus TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Add role column if it doesn't exist
            db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'vhiuser'", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding role column:', err.message);
                }
            });

            // Add customMenus column if it doesn't exist and migrate from menus if needed
            db.run("ALTER TABLE users ADD COLUMN customMenus TEXT", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding customMenus column:', err.message);
                } else {
                    // If customMenus column was added, check if menus column exists and migrate data
                    db.all("PRAGMA table_info(users)", (err, columns) => {
                        if (err) {
                            console.error('Error getting table info:', err.message);
                            return;
                        }
                        const hasMenus = columns.some(col => col.name === 'menus');
                        const hasCustomMenus = columns.some(col => col.name === 'customMenus');

                        if (hasMenus && hasCustomMenus) {
                            // Migrate data from menus to customMenus
                            db.run("UPDATE users SET customMenus = menus WHERE menus IS NOT NULL AND customMenus IS NULL", (err) => {
                                if (err) {
                                    console.error('Error migrating menus data:', err.message);
                                } else {
                                    console.log('Migrated menus data to customMenus');
                                    // Optionally drop the old menus column
                                    // db.run("ALTER TABLE users DROP COLUMN menus", (err) => {
                                    //     if (err) {
                                    //         console.error('Error dropping menus column:', err.message);
                                    //     } else {
                                    //         console.log('Dropped old menus column');
                                    //     }
                                    // });
                                }
                            });
                        }
                    });
                }
            });

            // Add updated_at column if it doesn't exist
            db.run("ALTER TABLE users ADD COLUMN updated_at DATETIME", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding updated_at column:', err.message);
                } else {
                    // Set updated_at for existing rows
                    db.run("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL", (updateErr) => {
                    });
                }
            });

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

            // Certifications table
            db.run(`CREATE TABLE IF NOT EXISTS certifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empId TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                certification_name TEXT NOT NULL,
                description TEXT,
                date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empId) REFERENCES resources (empId)
            )`);

    // CAM Status table
    db.run(`CREATE TABLE IF NOT EXISTS cam_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources (id),
        UNIQUE(resource_id, date)
    )`);

    // Bold Minds table
    db.run(`CREATE TABLE IF NOT EXISTS bold_minds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emp_id TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        nominated_for TEXT NOT NULL,
        nominated_month INTEGER NOT NULL,
        nominated_year INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (emp_id) REFERENCES resources (empId),
        UNIQUE(emp_id, nominated_year)
    )`);

    // Add nominated_year column if it doesn't exist
    db.run(`ALTER TABLE bold_minds ADD COLUMN nominated_year INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding nominated_year column:', err.message);
        }
    });

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
        // db.close(); // Removed to prevent closing the database handle prematurely
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

// Session middleware
app.use(session({
    secret: 'vhi-dashboard-secret-key', // In production, use a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Authentication middleware for API routes
app.use('/api', (req, res, next) => {
    const openRoutes = ['/login', '/register', '/logout', '/session'];
    if (openRoutes.includes(req.path)) {
        return next();
    }
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
});

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

    const { month } = req.query;
    let query = 'SELECT * FROM leaves WHERE 1=1';
    let params = [];

    if (month) {
        query += ' AND substr(date, 6, 2) = ?';
        params.push(month.padStart(2, '0'));
    }

    query += ' ORDER BY date';

    db.all(query, params, (err, leaves) => {
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

// Get all trainings with optional month and year filter
app.get('/api/trainings', (req, res) => {
    console.log('GET /api/trainings request received');

    const { month, year } = req.query;
    let query = 'SELECT * FROM trainings WHERE 1=1';
    let params = [];

    if (year) {
        query += ' AND substr(start_date, 1, 4) = ?';
        params.push(year);
    }

    if (month) {
        query += ' AND substr(start_date, 6, 2) = ?';
        params.push(month.padStart(2, '0'));
    }

    query += ' ORDER BY start_date DESC';

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

            // Get all learnings with optional month and year filter
            app.get('/api/learnings', (req, res) => {
                console.log('GET /api/learnings request received');

                const { month, year } = req.query;
                let query = 'SELECT * FROM learnings WHERE 1=1';
                let params = [];

                if (year) {
                    query += ' AND substr(date, 1, 4) = ?';
                    params.push(year);
                }

                if (month) {
                    query += ' AND substr(date, 6, 2) = ?';
                    params.push(month.padStart(2, '0'));
                }

                query += ' ORDER BY date DESC';

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

            // Certifications API endpoints

            // Get all certifications with optional month and year filter
            app.get('/api/certifications', (req, res) => {
                console.log('GET /api/certifications request received');

                const { month, year } = req.query;
                let query = 'SELECT * FROM certifications WHERE 1=1';
                let params = [];

                if (year) {
                    query += ' AND substr(date, 1, 4) = ?';
                    params.push(year);
                }

                if (month) {
                    query += ' AND substr(date, 6, 2) = ?';
                    params.push(month.padStart(2, '0'));
                }

                query += ' ORDER BY date DESC';

                db.all(query, params, (err, certifications) => {
                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    console.log(`Found ${certifications.length} certification entries`);
                    res.json(certifications);
                });
            });

            // Add new certification entry
            app.post('/api/certifications', (req, res) => {
                console.log('POST /api/certifications request received:', req.body);

                const { empId, resource_name, certification_name, description, date } = req.body;

                db.run('INSERT INTO certifications (empId, resource_name, certification_name, description, date) VALUES (?, ?, ?, ?, ?)', 
                    [empId, resource_name, certification_name, description, date], function(err) {
                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    console.log(`Certification entry added with ID: ${this.lastID}`);
                    res.json({ 
                        id: this.lastID, 
                        empId, 
                        resource_name, 
                        certification_name, 
                        description, 
                        date 
                    });
                });
            });

            // Update certification entry
            app.put('/api/certifications/:id', (req, res) => {
                const { id } = req.params;
                const { empId, resource_name, certification_name, description, date } = req.body;

                console.log(`PUT /api/certifications/${id} request received:`, req.body);

                db.run('UPDATE certifications SET empId = ?, resource_name = ?, certification_name = ?, description = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                    [empId, resource_name, certification_name, description, date, id], function(err) {
                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'Certification entry not found' });
                    }

                    console.log(`Certification entry ${id} updated successfully`);
                    res.json({ message: 'Certification entry updated successfully' });
                });
            });

            // Delete certification entry
            app.delete('/api/certifications/:id', (req, res) => {
                const { id } = req.params;

                console.log(`DELETE /api/certifications/${id} request received`);

                db.run('DELETE FROM certifications WHERE id = ?', [id], function(err) {
                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'Certification entry not found' });
                    }

                    console.log(`Certification entry ${id} deleted successfully`);
                    res.json({ message: 'Certification entry deleted successfully' });
                });
            });

// CAM Status API endpoints

// Get CAM status entries with optional filters
app.get('/api/cam-status', (req, res) => {
    console.log('GET /api/cam-status request received');

    const { year, month } = req.query;
    let query = 'SELECT cs.*, r.name as resource_name FROM cam_status cs JOIN resources r ON cs.resource_id = r.id WHERE 1=1';
    let params = [];

    if (year) {
        query += ' AND substr(cs.date, 1, 4) = ?';
        params.push(year);
    }

    if (month) {
        query += ' AND substr(cs.date, 6, 2) = ?';
        params.push(month.padStart(2, '0'));
    }

    query += ' ORDER BY cs.date, r.name';

    db.all(query, params, (err, camStatus) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${camStatus.length} CAM status entries`);
        res.json(camStatus);
    });
});

// Add/update CAM status entries
app.post('/api/cam-status', (req, res) => {
    console.log('POST /api/cam-status request received:', req.body);

    const { entries } = req.body; // Array of { resource_id, date, status }

    if (!entries || !Array.isArray(entries)) {
        return res.status(400).json({ error: 'Invalid request body. Expected { entries: [...] }' });
    }

    const promises = entries.map(entry => {
        return new Promise((resolve, reject) => {
            db.run('INSERT OR REPLACE INTO cam_status (resource_id, date, status) VALUES (?, ?, ?)',
                [entry.resource_id, entry.date, entry.status], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    });

    Promise.all(promises)
        .then(ids => {
            console.log(`CAM status entries saved/updated with IDs: ${ids.join(', ')}`);
            res.json({ message: 'CAM status entries saved successfully', ids });
        })
        .catch(err => {
            console.error('Database error:', err.message);
            res.status(500).json({ error: err.message });
        });
});

// Timesheet API endpoints

// Get timesheet entries with optional filters
app.get('/api/timesheet', (req, res) => {
    console.log('GET /api/timesheet request received');

    const { year, month, week, emp_id } = req.query;
    let query = 'SELECT * FROM timesheet WHERE 1=1';
    let params = [];

    if (year) {
        query += ' AND year = ?';
        params.push(parseInt(year, 10));
    }

    if (month) {
        query += ' AND month = ?';
        params.push(parseInt(month, 10));
    }

    if (week) {
        query += ' AND week = ?';
        params.push(parseInt(week, 10));
    }

    if (emp_id) {
        query += ' AND emp_id = ?';
        params.push(emp_id);
    }

    query += ' ORDER BY emp_id';

    db.all(query, params, (err, timesheet) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${timesheet.length} timesheet entries`);
        res.json(timesheet);
    });
});

// Add new timesheet entry
app.post('/api/timesheet', (req, res) => {
    console.log('POST /api/timesheet request received:', req.body);

    const { emp_id, year, month, week, whizible, changepoint, planview, comments } = req.body;

    db.run('INSERT OR REPLACE INTO timesheet (emp_id, year, month, week, whizible, changepoint, planview, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [emp_id, year, month, week, whizible, changepoint, planview, comments], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Timesheet entry added/updated with ID: ${this.lastID}`);
        res.json({
            id: this.lastID,
            emp_id,
            year,
            month,
            week,
            whizible,
            changepoint,
            planview,
            comments
        });
    });
});

// Update timesheet entry
app.put('/api/timesheet/:id', (req, res) => {
    const { id } = req.params;
    const { emp_id, year, month, week, whizible, changepoint, planview, comments } = req.body;

    console.log(`PUT /api/timesheet/${id} request received:`, req.body);

    db.run('UPDATE timesheet SET emp_id = ?, year = ?, month = ?, week = ?, whizible = ?, changepoint = ?, planview = ?, comments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [emp_id, year, month, week, whizible, changepoint, planview, comments, id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Timesheet entry not found' });
        }

        console.log(`Timesheet entry ${id} updated successfully`);
        res.json({ message: 'Timesheet entry updated successfully' });
    });
});

// Delete timesheet entry
app.delete('/api/timesheet/:id', (req, res) => {
    const { id } = req.params;

    console.log(`DELETE /api/timesheet/${id} request received`);

    db.run('DELETE FROM timesheet WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Timesheet entry not found' });
        }

        console.log(`Timesheet entry ${id} deleted successfully`);
        res.json({ message: 'Timesheet entry deleted successfully' });
    });
});

// Bold Minds API endpoints

// Get all Bold Minds nominations
app.get('/api/bold-minds', (req, res) => {
    console.log('GET /api/bold-minds request received');

    const { year } = req.query;
    let query = 'SELECT * FROM bold_minds WHERE 1=1';
    let params = [];

    if (year) {
        query += ' AND nominated_year = ?';
        params.push(parseInt(year, 10));
    }

    query += ' ORDER BY resource_name';

    db.all(query, params, (err, boldMinds) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${boldMinds.length} Bold Minds entries`);
        res.json(boldMinds);
    });
});

// Add/update Bold Minds nominations
app.post('/api/bold-minds', (req, res) => {
    console.log('POST /api/bold-minds request received:', req.body);

    const { nominations } = req.body; // Array of { emp_id, resource_name, nominated_for, nominated_month, nominated_year }

    if (!nominations || !Array.isArray(nominations)) {
        return res.status(400).json({ error: 'Invalid request body. Expected { nominations: [...] }' });
    }

    const promises = nominations.map(nomination => {
        return new Promise((resolve, reject) => {
            db.run('INSERT OR REPLACE INTO bold_minds (emp_id, resource_name, nominated_for, nominated_month, nominated_year) VALUES (?, ?, ?, ?, ?)',
                [nomination.emp_id, nomination.resource_name, nomination.nominated_for, nomination.nominated_month, nomination.nominated_year], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    });

    Promise.all(promises)
        .then(ids => {
            console.log(`Bold Minds nominations saved/updated with IDs: ${ids.join(', ')}`);
            res.json({ message: 'Bold Minds nominations saved successfully', ids });
        })
        .catch(err => {
            console.error('Database error:', err.message);
            res.status(500).json({ error: err.message });
        });
});

// Authentication API endpoints

// Register new user
app.post('/api/register', async (req, res) => {
    console.log('POST /api/register request received:', req.body);

    const { username, password, role } = req.body;
    const userRole = role || 'vhiuser';

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, userRole], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            console.log(`User registered with ID: ${this.lastID}`);
            res.json({ message: 'User registered successfully', id: this.lastID });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
app.post('/api/login', (req, res) => {
    console.log('POST /api/login request received:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        try {
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;

            console.log(`User ${username} logged in successfully`);
            res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
        } catch (error) {
            console.error('Error comparing password:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Logout user
app.post('/api/logout', (req, res) => {
    console.log('POST /api/logout request received');

    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Could not log out' });
        }

        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logout successful' });
    });
});

// Get current user session
app.get('/api/session', (req, res) => {
    console.log('GET /api/session request received');

    if (req.session.userId) {
        res.json({ user: { id: req.session.userId, username: req.session.username, role: req.session.role } });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Get user permissions based on role and custom menus
app.get('/api/permissions', (req, res) => {
    console.log('GET /api/permissions request received');

    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const role = req.session.role;
    const userId = req.session.userId;

    db.get('SELECT customMenus FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        let permissions = {
            menus: []
        };

        if (row && row.customMenus) {
            try {
                const userMenus = JSON.parse(row.customMenus);
                if (Array.isArray(userMenus) && userMenus.length > 0) {
                    permissions.menus = userMenus;
                    return res.json(permissions);
                }
            } catch (e) {
                console.error('Error parsing user menus JSON:', e);
            }
        }

        // Fallback to role-based permissions if no custom menus set
        if (role === 'admin') {
            permissions.menus = ['projectsMenu', 'timesheetMenu', 'calendarMenu', 'leavesMenu', 'trainingsMenu', 'learningsMenu', 'camStatusMenu', 'boldMindsMenu', 'userRoleMenu','certificationsMenu'];
        } else if (role === 'vhiuser' || role === 'vhiusers') {
            permissions.menus = ['timesheetMenu', 'calendarMenu', 'leavesMenu', 'trainingsMenu', 'learningsMenu', 'boldMindsMenu','certificationsMenu'];
        } else {
            permissions.menus = ['projectsMenu', 'timesheetMenu', 'calendarMenu', 'leavesMenu', 'trainingsMenu', 'learningsMenu', 'camStatusMenu'];
        }

        res.json(permissions);
    });
});

// Start the server
// User management API endpoints (Admin only)

// Get all users
app.get('/api/users', (req, res) => {
    console.log('GET /api/users request received');

    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    db.all('SELECT id, username, role, customMenus, created_at FROM users ORDER BY username', (err, users) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${users.length} users`);
        res.json(users);
    });
});

// Create new user
app.post('/api/users', async (req, res) => {
    console.log('POST /api/users request received:', req.body);

    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, password, role, customMenus } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'vhiuser';
        const userMenus = customMenus ? JSON.stringify(customMenus) : null;

        db.run('INSERT INTO users (username, password, role, customMenus) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, userRole, userMenus], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            console.log(`User created with ID: ${this.lastID}`);
            res.json({
                id: this.lastID,
                username,
                role: userRole,
                customMenus: customMenus || null
            });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    console.log(`PUT /api/users/${req.params.id} request received:`, req.body);

    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { username, password, role, customMenus } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        let query = 'UPDATE users SET username = ?, role = ?, customMenus = ?';
        let params = [username, role || 'vhiuser', customMenus ? JSON.stringify(customMenus) : null];

        if (password) {
            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += ', password = ?';
                params.push(hashedPassword);
            } catch (hashError) {
                console.error('Error hashing password:', hashError);
                return res.status(500).json({ error: 'Error hashing password' });
            }
        }

        query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(id);

        db.run(query, params, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            console.log(`User ${id} updated successfully`);
            res.json({ message: 'User updated successfully' });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    console.log(`DELETE /api/users/${req.params.id} request received`);

    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`User ${id} deleted successfully`);
        res.json({ message: 'User deleted successfully' });
    });
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Dashboard running at http://0.0.0.0:${PORT}/index.html`);
    });
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = initDb;

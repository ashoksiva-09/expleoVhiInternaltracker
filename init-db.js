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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (emp_id) REFERENCES resources (empId),
        UNIQUE(emp_id)
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
});

    // Close the database after all operations complete
    db.get("PRAGMA table_info(trainings)", (err, info) => {
        if (err) {
            console.error('Error checking trainings table info:', err);
            db.close();
        } else {
            const columns = [];
            db.all("PRAGMA table_info(trainings)", (err, rows) => {
                if (err) {
                    console.error('Error fetching trainings table columns:', err);
                    db.close();
                } else {
                    rows.forEach(row => columns.push(row.name));
                    if (!columns.includes('course_name')) {
                        db.run("ALTER TABLE trainings ADD COLUMN course_name TEXT", (err) => {
                            if (err) {
                                console.error('Error adding course_name column:', err);
                            } else {
                                console.log('Added course_name column to trainings table');
                            }
                            db.close();
                        });
                    } else {
                        db.close();
                    }
                }
            });
        }
    });

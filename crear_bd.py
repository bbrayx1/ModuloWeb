import sqlite3
import os

# 1. Asegurar que la carpeta 'db' existe
if not os.path.exists('db'):
    os.makedirs('db')

ruta_db = 'db/siigaa.sqlite'

# Si la base de datos ya existe, la borramos para empezar en limpio con tu nuevo esquema
if os.path.exists(ruta_db):
    os.remove(ruta_db)

# 2. Conectarse a SQLite
conexion = sqlite3.connect(ruta_db)
cursor = conexion.cursor()

# 3. Tu esquema SQL completo y corregido
esquema_sql = """
-- =====================================================
-- 1. DATOS QUE YA EXISTEN EN EL SIIGAA
-- =====================================================
CREATE TABLE SIIGAA_Estudiante (
    cod_matricula         VARCHAR(15) PRIMARY KEY,
    dni                   VARCHAR(8)  NOT NULL,
    apellidos_nombres     VARCHAR(150) NOT NULL,
    escuela_profesional   VARCHAR(100),
    ciclo_actual          VARCHAR(5),
    situacion_academica   VARCHAR(30),
    es_regular            BOOLEAN DEFAULT TRUE,
    es_invicto            BOOLEAN DEFAULT TRUE,
    promedio_ponderado    DECIMAL(4,2),
    asignaturas_desaprobadas INTEGER DEFAULT 0,
    lugar_procedencia     VARCHAR(50),
    lugar_residencia      VARCHAR(50),
    carga_familiar        INTEGER,
    procedencia_familiar  VARCHAR(50),
    ingresos_economicos   DECIMAL(10,2),
    condicion_ocupacional VARCHAR(50)
);

-- =====================================================
-- 2. TABLAS DEL MÓDULO COMEDOR
-- =====================================================
CREATE TABLE Comedor_Convocatoria (
    id_convocatoria       INTEGER PRIMARY KEY AUTOINCREMENT,
    semestre              VARCHAR(10) NOT NULL,
    vacantes_totales      INTEGER NOT NULL,
    vacantes_disponibles  INTEGER NOT NULL,
    fecha_inicio          DATE,
    fecha_fin             DATE,
    estado                VARCHAR(20) DEFAULT 'ACTIVA'
);

CREATE TABLE Comedor_Postulacion (
    id_postulacion        INTEGER PRIMARY KEY AUTOINCREMENT,
    cod_matricula         VARCHAR(15) NOT NULL,
    id_convocatoria       INTEGER NOT NULL,
    puntaje_academico     INTEGER,
    puntaje_socioeconomico INTEGER,
    puntaje_total         INTEGER,
    categoria_minsa       CHAR(1),
    prioridad             INTEGER,
    estado                VARCHAR(30) DEFAULT 'REGISTRADA',
    tipo_beneficio        VARCHAR(30),
    motivo_rechazo        TEXT,
    fecha_registro        DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion   DATETIME,
    FOREIGN KEY (cod_matricula) REFERENCES SIIGAA_Estudiante(cod_matricula),
    FOREIGN KEY (id_convocatoria) REFERENCES Comedor_Convocatoria(id_convocatoria)
);

CREATE TABLE Comedor_Evaluacion_SS (
    id_evaluacion         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_postulacion        INTEGER NOT NULL UNIQUE,
    lugar_procedencia     VARCHAR(50),
    lugar_residencia      VARCHAR(50),
    carga_familiar        INTEGER,
    ingresos_economicos   DECIMAL(10,2),
    condicion_estudiante  VARCHAR(50),
    observaciones         TEXT,
    id_evaluador          VARCHAR(50),
    fecha_evaluacion      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_postulacion) REFERENCES Comedor_Postulacion(id_postulacion)
);

CREATE TABLE Comedor_Documentos (
    id_documento          INTEGER PRIMARY KEY AUTOINCREMENT,
    id_postulacion        INTEGER NOT NULL,
    tipo_documento        VARCHAR(60),
    nombre_archivo        VARCHAR(150),
    ruta_archivo          VARCHAR(255),
    peso_mb               DECIMAL(5,2),
    validado              BOOLEAN DEFAULT FALSE,
    fecha_subida          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_postulacion) REFERENCES Comedor_Postulacion(id_postulacion)
);

CREATE TABLE Comedor_Historial_Estado (
    id_historial          INTEGER PRIMARY KEY AUTOINCREMENT,
    id_postulacion        INTEGER NOT NULL,
    estado_anterior       VARCHAR(30),
    estado_nuevo          VARCHAR(30),
    usuario               VARCHAR(50),
    observacion           TEXT,
    fecha_cambio          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_postulacion) REFERENCES Comedor_Postulacion(id_postulacion)
);

-- =====================================================
-- 3. INSERTAR DATOS DE PRUEBA
-- =====================================================
INSERT INTO Comedor_Convocatoria (semestre, vacantes_totales, vacantes_disponibles, estado)
VALUES ('2026-I', 400, 400, 'ACTIVA');

INSERT INTO SIIGAA_Estudiante VALUES
('0202414046', '60817359', 'RUBIO GONZALES BRAYAM JHOAN', 'Ingeniería de Sistemas', 'V', 'Regular', TRUE, TRUE, 14.40, 0, 'Nativo', 'Urbano popular', 3, 'Completa', 100.00, 'Dependiente'),
('0202414060', '71234567', 'YOMONA SANTILLAN WILHELM URIEL', 'Ingeniería de Sistemas', 'V', 'Regular', TRUE, TRUE, 13.50, 0, 'Influencia', 'Urbano marginal', 5, 'Padres separados', 1200.00, 'Independiente'),
('0202414033', '72345678', 'ORTEGA LEON SAMUEL JOSUE', 'Educación', 'I', 'Regular', TRUE, TRUE, 09.00, 0, 'Otras', 'Rural', 2, 'Completa', 0.00, 'Desempleado'),
('0202414042', '72345678', 'ROBLES CUEVA MADDOX CARLOS', 'Ingeniería de Sistemas', 'V', 'Regular', TRUE, TRUE, 15.50, 0, 'Otras', 'Rural', 2, 'Completa', 200.00, 'Independiente');
"""

try:
    # 4. Ejecutar el script SQL
    print("Construyendo la base de datos profesional...")
    cursor.executescript(esquema_sql)
    conexion.commit()
    print("✅ ¡Éxito! Base de datos 'siigaa.sqlite' creada correctamente en la carpeta 'db/'.")
except sqlite3.Error as error:
    print(f"❌ Error al crear la base de datos: {error}")
finally:
    if conexion:
        conexion.close()
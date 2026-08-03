-- =====================================================
-- 1. DATOS QUE YA EXISTEN EN EL SIIGAA (solo referencia)
-- En la práctica se consultan, no se crean
-- =====================================================
-- Tabla conceptual (en producción sería una vista o consulta al SIIGAA real)
CREATE TABLE SIIGAA_Estudiante (
    cod_matricula          VARCHAR(15) PRIMARY KEY,
    dni                   VARCHAR(8)  NOT NULL,
    apellidos_nombres     VARCHAR(150) NOT NULL,
    escuela_profesional   VARCHAR(100),
    ciclo_actual          VARCHAR(5),
    
    -- Académicos (Art. 21)
    situacion_academica   VARCHAR(30),          -- Regular, etc.
    es_regular            BOOLEAN DEFAULT TRUE,
    es_invicto            BOOLEAN DEFAULT TRUE,
    promedio_ponderado    DECIMAL(4,2),
    asignaturas_desaprobadas INTEGER DEFAULT 0,
    
    -- Socioeconómicos (Art. 20) - vienen de la ficha
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

-- 2.1 Convocatorias
CREATE TABLE Comedor_Convocatoria (
    id_convocatoria       INTEGER PRIMARY KEY AUTOINCREMENT,
    semestre              VARCHAR(10) NOT NULL,          -- Ej: 2026-I
    vacantes_totales      INTEGER NOT NULL,              -- 400
    vacantes_disponibles  INTEGER NOT NULL,
    fecha_inicio          DATE,
    fecha_fin             DATE,
    estado                VARCHAR(20) DEFAULT 'ACTIVA'   -- ACTIVA, CERRADA, FINALIZADA
);

-- 2.2 Postulaciones
CREATE TABLE Comedor_Postulacion (
    id_postulacion        INTEGER PRIMARY KEY AUTOINCREMENT,
    cod_matricula          VARCHAR(15) NOT NULL,
    id_convocatoria       INTEGER NOT NULL,
    
    -- Puntajes
    puntaje_academico     INTEGER,
    puntaje_socioeconomico INTEGER,
    puntaje_total         INTEGER,
    
    -- Categorización (Art. 23)
    categoria_minsa       CHAR(1),                       -- A, B, C, D, E
    prioridad             INTEGER,                       -- 1, 2, 3
    
    -- Estado del proceso
    estado                VARCHAR(30) DEFAULT 'REGISTRADA',
    -- Valores posibles: REGISTRADA, EN_REVISION, EVALUADA, 
    -- APROBADA, RECHAZADA, RECHAZADA_AUTOMATICA
    
    tipo_beneficio        VARCHAR(30),                   -- Beca completa, Semibeca, Pago 50%
    motivo_rechazo        TEXT,
    
    fecha_registro        DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion   DATETIME,
    
    FOREIGN KEY (cod_matricula) REFERENCES SIIGAA_Estudiante(cod_matricula),
    FOREIGN KEY (id_convocatoria) REFERENCES Comedor_Convocatoria(id_convocatoria)
);

-- 2.3 Evaluación socioeconómica detallada (la llena Servicio Social)
CREATE TABLE Comedor_Evaluacion_SS (
    id_evaluacion         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_postulacion        INTEGER NOT NULL UNIQUE,
    lugar_procedencia     VARCHAR(50),
    lugar_residencia      VARCHAR(50),
    carga_familiar        INTEGER,
    ingresos_economicos   DECIMAL(10,2),
    condicion_estudiante  VARCHAR(50),
    observaciones         TEXT,
    id_evaluador          VARCHAR(50),                   -- usuario de Servicio Social
    fecha_evaluacion      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_postulacion) REFERENCES Comedor_Postulacion(id_postulacion)
);

-- 2.4 Documentos adjuntos
CREATE TABLE Comedor_Documentos (
    id_documento          INTEGER PRIMARY KEY AUTOINCREMENT,
    id_postulacion        INTEGER NOT NULL,
    tipo_documento        VARCHAR(60),                   -- Declaración jurada, Recibo luz, Croquis...
    nombre_archivo        VARCHAR(150),
    ruta_archivo          VARCHAR(255),
    peso_mb               DECIMAL(5,2),
    validado              BOOLEAN DEFAULT FALSE,
    fecha_subida          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_postulacion) REFERENCES Comedor_Postulacion(id_postulacion)
);

-- 2.5 Historial de cambios de estado (auditoría)
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


INSERT INTO Comedor_Convocatoria (semestre, vacantes_totales, vacantes_disponibles, estado)
VALUES ('2026-I', 400, 400, 'ACTIVA');

INSERT INTO SIIGAA_Estudiante VALUES
('0202414046', '60817359', 'RUBIO GONZALES BRAYAM JHOAN', 'Ingeniería de Sistemas', 'V',
 'Regular', TRUE, TRUE, 15.40, 0,
 'Nativo', 'Urbano popular', 3, 'Completa', 1200.00, 'Dependiente'),
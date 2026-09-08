const COURSES = {
  // ---- Foundation / general science (shared across programs) ----
  ENG101: ["Basic English", 3, []],
  ENG102: ["Composition and Communication Skills", 3, ["ENG101"]],
  GEN226: ["Emergence of Bangladesh", 3, ["ENG102"]],
  CHE109: ["Engineering Chemistry-I", 4, []],
  PHY109: ["Engineering Physics-I", 4, []],
  PHY209: ["Engineering Physics-II", 3, []],
  MAT101: ["Differential & Integral Calculus", 3, []],
  MAT102: ["Differential Equations & Special Functions", 3, ["MAT101"]],
  MAT104: ["Co-ordinate Geometry & Vector Analysis", 3, ["MAT101"]],
  MAT205: ["Linear Algebra & Complex Variables", 3, ["MAT102"]],
  STA102: ["Statistics and Probability", 3, ["MAT101"]],

  // ---- CSE core + major ----
  CSE103: ["Structured Programming", 4.5, []], CSE106: ["Discrete Mathematics", 3, ["CSE103"]],
  CSE110: ["Object Oriented Programming", 4.5, ["CSE103", "CSE106"]], CSE200: ["Computer-Aided Engineering Drawing", 1, []],
  CSE207: ["Data Structures", 4, ["CSE110"]], CSE209: ["Electrical Circuits", 4, []], CSE246: ["Algorithms", 4.5, ["CSE207"]],
  CSE251: ["Electronic Circuits", 4, ["CSE209"]], CSE302: ["Database Systems", 4.5, ["CSE106", "CSE110"]],
  CSE325: ["Operating Systems", 4, ["CSE207"]], CSE345: ["Digital Logic Design", 4, ["CSE251"]],
  CSE347: ["Information System Analysis and Design", 4, ["CSE302", "CSE251"]], CSE360: ["Computer Architecture", 3, ["CSE325"]],
  CSE405: ["Computer Networks", 4, ["CSE246"]], CSE407: ["Green Computing", 3, ["CSE405"]],
  CSE487: ["Computer and Cyber Security", 3, ["CSE405"]], CSE495: ["IT Project Management and Entrepreneurship", 3, ["CSE347"]],
  CSE400A: ["Capstone Project (Part 1 of 3)", 1, []], CSE400B: ["Capstone Project (Part 2 of 3)", 2, ["CSE400A"]],
  CSE400C: ["Capstone Project (Part 3 of 3)", 3, ["CSE400B"]],

  CSE225: ["Numerical Methods", 4, ["CSE103"]], CSE303: ["Statistics for Data Science", 4, ["STA102"]],
  CSE313: ["Theory of Computations", 3, ["CSE246"]], CSE350: ["Data Communications", 4, ["CSE251"]],
  CSE355: ["Digital System Design", 4, ["CSE345"]], CSE366: ["Artificial Intelligence", 4, ["CSE246"]],
  CSE406: ["Internet of Things", 4, ["CSE405"]], CSE412: ["Software Engineering", 4, ["CSE347"]],
  CSE420: ["Computer Graphics", 4, ["CSE246"]], CSE422: ["Simulation and Modeling", 4, ["CSE246"]],
  CSE423: ["Software Architecture", 4, ["CSE412"]], CSE428: ["Human Computer Interactions", 4, ["CSE412"]],
  CSE430: ["Software Testing and Quality Assurance", 4, ["CSE412"]], CSE432: ["Digital Signal Processing", 4, ["CSE246", "CSE347"]],
  CSE438: ["Digital Image Processing", 4, ["CSE246"]], CSE442: ["Microprocessors and Microcontrollers", 4, ["CSE360"]],
  CSE445: ["Computer Vision", 4, ["CSE246"]], CSE446: ["ASIC Design Using FPGA", 4, ["CSE345"]],
  CSE452: ["Distributed Systems and Algorithms", 4, ["CSE325"]], CSE453: ["Wireless Network", 4, ["CSE405"]],
  CSE457: ["Cellular Networks", 4, ["CSE405"]], CSE460: ["Cryptography", 3, ["CSE246"]],
  CSE464: ["Advanced Database System", 4, ["CSE302"]], CSE471: ["Compiler Design", 4, ["CSE246"]],
  CSE472: ["Advanced Network Services and Management", 4, ["CSE405"]], CSE473: ["Network Security and Systems", 4, ["CSE405"]],
  CSE474: ["Pattern Recognition", 4, ["CSE366"]], CSE475: ["Machine Learning", 4, ["CSE366"]],
  CSE477: ["Data Mining", 4, ["CSE366"]], CSE479: ["Web Programming", 4, ["CSE302"]],
  CSE481: ["Nature-Inspired Computing", 4, ["CSE246"]], CSE483: ["Graph Theory", 3, ["CSE246"]],
  CSE484: ["Computational Geometry", 3, ["CSE246"]], CSE486: ["Bioinformatics Algorithms", 4, ["CSE246"]],
  CSE488: ["Big Data Analytics", 4, ["CSE302"]], CSE489: ["Mobile Programming", 4, ["CSE246"]],
  CSE491: ["VLSI Design", 4, ["CSE345"]], CSE492: ["Robotics", 4, ["CSE366"]], CSE494: ["Embedded Systems", 4, ["CSE442"]],

  // ---- General education elective pool (shared — confirmed by both the CSE and EEE
  //      curriculum exports, which list the same GEN/POP/JPN codes) ----
  ACT101: ["Financial Accounting", 3, []], BUS231: ["Business Communication", 3, ["ENG101"]],
  BUS321: ["Business for Engineering and Technology", 3, ["ENG101"]], ECO101: ["Principles of Microeconomics", 3, []],
  FIN101: ["Principles of Finance", 3, ["STA102"]], GEN201: ["Bangladesh Studies", 3, ["ENG101"]],
  GEN202: ["Eastern Culture and Heritage", 3, []], GEN203: ["Ecological System and Environment", 3, []],
  GEN204: ["Western Thought", 3, []], GEN205: ["Introduction to Psychology", 3, []], GEN207: ["Industrial Psychology", 3, []],
  GEN208: ["Introduction to Philosophy", 3, []], GEN209: ["Introduction to Social Psychology", 3, []], GEN210: ["International Relations", 3, ["ENG101"]],
  GEN211: ["Concepts of Journalism & Media Studies", 3, []], GEN212: ["Women in Development", 3, []],
  GEN213: ["Introduction to German Language", 3, []], GEN214: ["Introduction to Development Studies", 3, []],
  GEN215: ["Introduction to French Language", 3, []], GEN216: ["Introduction to Spanish Language", 3, []],
  GEN217: ["Introduction to Chinese Language", 3, []], GEN218: ["Introduction to Arabic Language", 3, []],
  GEN220: ["Principles of Public Relations", 3, []], GEN221: ["Globalization, Development and Change", 3, []],
  GEN223: ["Contemporary Security Studies in Asia-Pacific", 3, []], GEN224: ["Bengali Language", 3, []],
  GEN239: ["Professional Ethics", 3, []], JPN7101: ["Elementary Japanese 1", 3, []],
  MGT321: ["Industrial Management", 3, ["ENG102"]], MGT337: ["Production Operations Management", 3, ["STA102"]],
  MKT101: ["Principles of Marketing", 3, []], POP201: ["Health Challenges of Adolescents and Youths", 3, []],
  POP202: ["Introduction to Public Health", 3, []], POP203: ["Introduction to Population Studies", 3, []],
  SOC211: ["Eastern Culture and Heritage", 3, []], SOC217: ["Religion, Ethnicity, Culture and Development in South Asia", 3, ["ENG101"]],
  SOC317: ["Sociology of Science and Technology", 3, []],

  // ---- EEE courses ----
  // Titles + credits confirmed from the curriculum export:
  EEE101: ["Electrical Circuits I", 4, []],
  EEE102: ["Electronic Circuits I", 4, []],
  EEE105: ["Computer Programming", 4, []],
  EEE201: ["Electrical Circuits II", 4, []],
  EEE202: ["Electronic Circuits II", 4, []],
  EEE204: ["Numerical Analysis for Electrical Engineering", 4, []],
  EEE205: ["Digital Logic Design", 4, []],
  EEE300: ["Electrical Services Design", 3, []],
  EEE301: ["Electrical Machines", 4, []],
  EEE303: ["Signals and Linear Systems", 3, []],
  EEE304: ["Electrical Power Systems", 4, []],
  EEE305: ["Electromagnetic Fields and Waves", 3, []],
  EEE306: ["Fundamentals of Embedded Systems", 4, []],
  EEE307: ["Telecommunication Engineering", 4, []],
  EEE308: ["Electronic Properties of Materials", 3, []],
  EEE309: ["Digital Signal Processing", 4, []],
  EEE399: ["Engineering Project Management", 3, []],
  EEE402: ["Control Systems", 4, []],
  EEE403: ["Engineer and Society", 3, []],
  EEE400A: ["Final Year Design Project Part 1", 1, []],
  EEE400B: ["Final Year Design Project Part 2", 2, []],
  EEE400C: ["Final Year Design Project Part 3", 3, []],

  // ---- EEE: ELECT elective pool (20 credits) — from the curriculum export ----
  EEE413: ["Fundamentals of Nanotechnology", 3, []],
  EEE414: ["Optoelectronics", 3, []],
  EEE415: ["Semiconductor Processing and Fabrication", 4, []],
  EEE416: ["VLSI Circuits and Systems", 4, []],
  EEE417: ["Semiconductor Devices", 3, []],
  EEE418: ["Analog Integrated Circuits", 4, []],
  EEE419: ["Biomedical Electronics", 3, []],
  EEE421: ["RF and Microwave Engineering", 4, []],
  EEE422: ["Digital Communications", 4, []],
  EEE423: ["Wireless and Mobile Communications", 4, []],
  EEE425: ["Digital Image Processing", 3, []],
  EEE426: ["Advanced Telecommunication Engineering", 3, []],
  EEE433: ["Computer Networks", 4, []],
  EEE434: ["Computer Architecture", 4, []],
  EEE435: ["Embedded Systems", 4, []],
  EEE436: ["Introduction to Machine Learning", 3, []],
  EEE441: ["Power Stations", 3, []],
  EEE442: ["Switchgear and Protective Relays", 4, []],
  EEE444: ["High Voltage Engineering", 3, []],
  EEE445: ["Renewable Energy", 3, []],
  EEE446: ["Power System Operation and Reliability", 3, []],
  EEE447: ["Power Electronics", 4, []],
  EEE450: ["Special Topic in Electrical and Electronic Engineering", 3, []],
  EEE490: ["Directed Research", 3, []],
  // The ELECT pool also draws two CSE electives (per the curriculum export):
  CSE436: ["Multimedia Design & Development", 3, []],
  CSE450: ["Data Structure and Algorithm", 4, []],

  // ---- EEE: Non-Engineering elective pool (3 credits) — from the curriculum export ----
  ECO7101: ["Principles of Microeconomics", 3, []],
  MIS101: ["Introduction to Management Information System", 3, []],

  // ---- MATH (B.Sc. Hons in Mathematics) core sequence ----

  CS116: ["Programming Language I", 4, []],
  CS217: ["Data Structures and Algorithms", 4, ["CS116"]],
  CS312: ["Programming Language II", 4, ["CS116"]],
  CS391: ["Introduction to Artificial Intelligence", 3, []],
  MATH111: ["Fundamentals of Mathematics", 3, []],
  MATH112: ["Calculus I", 3, []],
  MATH114: ["Calculus II", 3, ["MATH112"]],
  MATH115: ["Analytic Geometry and Vector Analysis", 3, []],
  MATH116: ["Differential Equations I", 3, ["MATH112"]],
  PHY212: ["Introduction Quantum Physics", 3, ["PHY109"]],
  MATH211: ["Linear Algebra", 3, ["MATH112"]],
  MATH212: ["Differential Equations II", 4, ["MATH116"]],
  MATH214: ["Real Analysis", 3, ["MATH112"]],
  MATH215: ["Abstract Algebra", 3, ["MATH211", "MATH214"]],
  MATH311: ["Mathematical Methods", 3, ["MATH212"]],
  MATH314: ["Mechanics", 3, ["MATH115"]],
  MATH315: ["Complex Analysis", 3, ["MATH112"]],
  MATH316: ["Discrete Mathematics", 3, ["MATH111"]],
  MATH317: ["Numerical Analysis I", 4, ["MATH114", "MATH211"]],
  MATH318: ["Theory of Numbers", 3, ["MATH111"]],
  MATH319: ["Operations Research", 3, []],
  MATH411: ["Numerical Analysis II", 4, ["MATH212", "MATH317"]],
  MATH412: ["Tensor Analysis", 3, ["MATH115"]],
  MATH414: ["Differential Geometry", 3, ["MATH412"]],
  MATH415: ["Fluid Mechanics", 3, ["MATH212"]],
  MATH416: ["Industrial Mathematics", 3, ["STA204"]],
  MATH499: ["Research Project", 3, []],
  STA104: ["Elements of Statistics & Probability", 3, []],
  STA204: ["Advanced Statistics", 3, ["STA104"]],

  // ---- MATH: major elective pool (15 credits) ----
  MATH320: ["Optimization Technique", 4, ["MATH317"]],
  MATH420: ["Fuzzy Mathematics", 3, []],
  MATH422: ["Theory of Lattices", 3, []],
  MATH426: ["Stochastic Calculus", 3, []],
  MATH428: ["Theory of Groups", 3, []],
  MATH430: ["Theory of Rings and Modules", 3, []],
  MATH432: ["Functional Analysis", 3, ["MATH214"]],
  MATH434: ["Discrete Mathematics and Graph Theory", 3, []],
  MATH454: ["Classical Mechanics", 3, []],
  MATH456: ["Quantum Mechanics", 3, []],
  MATH458: ["Plasma Physics", 3, []],
  MATH460: ["General Theory of Relativity", 3, []],
  MATH464: ["Mathematical Modeling in Biology", 3, []],
  MATH470: ["Mathematical Modeling in Finance and Business", 3, []],
  MATH478: ["Machine Learning", 3, []],
  MATH480: ["Econometrics", 3, []],
  MATH482: ["Asymptotic Analysis & Perturbation Methods", 3, []],
  MATH484: ["Risk Management & Actuarial Science", 3, []],
  MATH486: ["Fluid Mechanics II", 3, []],
  MATH488: ["Computational Linear Algebra and Functions Approximations", 3, []],
  MATH490: ["Computer Aided Geometrical Design", 3, []],
  STA391: ["Machine Learning", 3, []],

  // ---- MATH: shared general-education elective pools (BESL/CHK/QSEK and OGED) ----
  BIO100: ["Introductory Biology", 3, []],
  CHE100: ["Introductory Chemistry", 3, []],
  PHY100: ["Introductory Physics", 3, []],
  SOC101: ["Introduction to Sociology", 3, []],
  BUS101: ["Introduction to Business", 3, []],
  EDC101: ["Introduction to Entrepreneurship", 3, []],
  GEN206: ["Introduction to Sociology", 3, []],
  ECO102: ["Introduction to Macroeconomics", 3, ["ENG102"]],
  MGT101: ["Principles of Management", 3, []],
  PHY112: ["Physics I", 4, []],
  MATH117: ["Programming Language I", 4, []],
  MATH216: ["Data Structures and Algorithms", 4, ["MATH117"]],
  MATH312: ["Programming Language II", 4, ["MATH117"]],
  OGEC001: ["Optional General Education Course 1", 3, ["ENG102"]],
  OGEC002: ["Optional General Education Course 2", 3, ["ENG102"]],
  OBE001: ["Optional Business & Economics Course 1", 3, ["ENG102"]],
  OBE002: ["Optional Business & Economics Course 2", 3, ["ENG102"]],
  ECM001: ["Elective Course 1", 3, []],
  ECM002: ["Elective Course 2", 3, []],
  ECM003: ["Elective Course 3", 3, []],
  ECM004: ["Elective Course 4", 3, []]
};

const GENERAL_ED_POOL = ["ACT101", "BUS231", "BUS321", "ECO101", "FIN101", "GEN201", "GEN202", "GEN203", "GEN204", "GEN205", "GEN207", "GEN208", "GEN209", "GEN210", "GEN211", "GEN212", "GEN213", "GEN214", "GEN215", "GEN216", "GEN217", "GEN218", "GEN220", "GEN221", "GEN223", "GEN224", "GEN239", "JPN7101", "MGT321", "MGT337", "MKT101", "POP201", "POP202", "POP203", "SOC211", "SOC217", "SOC317"];

const EEE_OGEC_POOL = ["GEN201", "GEN202", "GEN203", "GEN204", "GEN205", "GEN207", "GEN208", "GEN209", "GEN210", "GEN211", "GEN212", "GEN213", "GEN214", "GEN215", "GEN216", "GEN217", "GEN218", "GEN220", "GEN221", "GEN223", "GEN224", "JPN7101", "POP201", "POP202", "POP203"];

const EEE_NONENG_POOL = ["ECO101", "ECO7101", "MIS101", "MKT101"];

const EEE_ELECTIVE_POOL = ["CSE436", "CSE450", "EEE413", "EEE414", "EEE415", "EEE416", "EEE417", "EEE418", "EEE419", "EEE421", "EEE422", "EEE423", "EEE425", "EEE426", "EEE433", "EEE434", "EEE435", "EEE436", "EEE441", "EEE442", "EEE444", "EEE445", "EEE446", "EEE447", "EEE450", "EEE490"];

const MATH_GENED_POOL = ["BUS101", "EDC101", "GEN206", "BIO100", "CHE100", "GEN203", "PHY100", "SOC101"];

const MATH_OGED_POOL = ["GEN201", "GEN202", "GEN204", "GEN226", "ACT101", "ECO101", "ECO102", "FIN101", "GEN205", "GEN206", "GEN207", "GEN208", "GEN210", "GEN211", "GEN213", "GEN215", "GEN216", "GEN217", "GEN239", "JPN7101", "MGT101", "MKT101"];

const MATH_ELECTIVE_POOL = ["CS391", "MATH320", "MATH420", "MATH422", "MATH426", "MATH428", "MATH430", "MATH432", "MATH434", "MATH454", "MATH456", "MATH458", "MATH460", "MATH464", "MATH470", "MATH478", "MATH480", "MATH482", "MATH484", "MATH486", "MATH488", "MATH490", "STA391"];

const MATH_OGEC_POOL = ["GEN202", "GEN203", "GEN204", "GEN205", "GEN206", "GEN207", "GEN208", "GEN210", "GEN211", "GEN239", "GEN2XX"];

const MATH_ECM_POOL = ["MAT421", "MAT422", "MAT424", "MAT425", "MAT431", "MAT432", "MAT433", "MAT434", "MAT451", "MAT452", "MAT453", "MAT454", "MAT461", "MAT462", "MAT471", "MAT472"];

const MATH_OBE_POOL = ["BUS101", "ACT101", "ECO101", "ECO102", "FIN101", "MGT101", "MKT101"];

const MATH_ADVICE = {
  MATH499: "The course catalog lists MATH499 (Research Project) as requiring at least 95 completed credits."
};

const CSE_MAJOR_TRACKS = {
  comm: ["CSE350", "CSE432", "CSE452", "CSE453", "CSE457", "CSE489"],
  sw: ["CSE412", "CSE422", "CSE423", "CSE428", "CSE430", "CSE452", "CSE464", "CSE479", "CSE489"],
  hw: ["CSE355", "CSE406", "CSE442", "CSE491", "CSE492", "CSE494"],
  ai: ["CSE303", "CSE366", "CSE420", "CSE438", "CSE452", "CSE474", "CSE477", "CSE486"]
};

const CSE_TRACK_LABELS = { all: "All tracks", comm: "Networking", sw: "Software", hw: "Hardware", ai: "AI & Data" };

const CSE_ADVICE = {
  CSE350: "Minimum 50 completed credits.",
  CSE355: "Minimum 67 completed credits.",
  CSE366: "Minimum 73 completed credits.",
  CSE412: "Minimum 73 completed credits.",
  CSE452: "Minimum 97 completed credits.",
  CSE420: "Minimum 85 completed credits.",
  CSE438: "Minimum 97 completed credits.",
  CSE489: "Minimum 75 completed credits.",
  CSE406: "Minimum 97 completed credits.",
  CSE442: "Minimum 85 completed credits.",
  CSE491: "Minimum 97 completed credits.",
  CSE492: "Minimum 97 completed credits.",
  CSE494: "Minimum 97 completed credits.",
  CSE400A: "Capstone sequence. The curriculum lists CSE400 as requiring at least 95 completed credits.",
  CSE400B: "Requires CSE400A and is part 2 of the three-part capstone.",
  CSE400C: "Requires CSE400B and is part 3 of the three-part capstone."
};

/* An elective slot: not a single fixed course, so it isn't a key into COURSES.
   kind drives how openSlot() figures out what's eligible for it:
     "gen_ed"    -> pool is the program's generalEd list
     "major"     -> pool is the current major track (or all tracks combined)
     "nonmajor"  -> pool is every major-track course NOT in the current track
     "open"      -> no known pool; point the person at their advising sheet
   `pool` can be set explicitly to override the computed pool (used for OGEC,
   which the EEE source confirms draws from the same gen-ed list as CSE). */
function slot(code, credits, label, hint, kind, pool) {
  return { code, credits, label, hint, kind, pool: pool || null };
}

const CSE_YEARS = [
  {
    name: "1st Year", total: 35, semesters: [
      { name: "Semester 1", courses: ["ENG101", "MAT101", "CSE103"] },
      { name: "Semester 2", courses: ["ENG102", "MAT102", "CSE106", "CHE109"] },
      { name: "Semester 3", courses: ["PHY109", "MAT104", "CSE110"] }
    ]
  },
  {
    name: "2nd Year", total: 35, semesters: [
      { name: "Semester 1", courses: ["GEN226", "STA102", "CSE200", "CSE209"] },
      { name: "Semester 2", courses: [slot("GEN ED I", 3, "General Education Elective", "Choose from the approved general education pool", "gen_ed"), "MAT205", "CSE207", "CSE251"] },
      { name: "Semester 3", courses: [slot("GEN ED II", 3, "General Education Elective", "Choose from the approved general education pool", "gen_ed"), "PHY209", "CSE325"] }
    ]
  },
  {
    name: "3rd Year", total: 35, semesters: [
      { name: "Semester 1", courses: [slot("GEN ED III", 3, "General Education Elective", "Choose from the approved general education pool", "gen_ed"), "CSE246", "CSE302"] },
      { name: "Semester 2", courses: ["CSE345", "CSE347", slot("MAJOR I", 4, "Major Elective 1", "Choose a 4-credit course from your major area", "major")] },
      { name: "Semester 3", courses: ["CSE360", "CSE405", slot("MAJOR II", 4, "Major Elective 2", "Choose a 4-credit course from your major area", "major")] }
    ]
  },
  {
    name: "4th Year", total: 35, semesters: [
      { name: "Semester 1", courses: ["CSE400A", "CSE407", slot("MAJOR III", 4, "Major Elective 3", "Choose a 4-credit course from your major area", "major"), slot("NON-MAJOR I", 4, "CSE Elective (non-major)", "8 credits total from areas outside your selected major", "nonmajor")] },
      { name: "Semester 2", courses: ["CSE400B", "CSE487", slot("MAJOR IV", 4, "Major Elective 4", "Choose a 4-credit course from your major area", "major"), slot("NON-MAJOR II", 4, "CSE Elective (non-major)", "8 credits total from areas outside your selected major", "nonmajor")] },
      { name: "Semester 3", courses: ["CSE400C", "CSE495", slot("MAJOR V", 4, "Major Elective 5", "Choose a 4-credit course from your major area", "major")] }
    ]
  }
];


const EEE_YEARS = [
  {
    name: "1st Year", total: 35, semesters: [
      { name: "Semester 1", total: "11", courses: ["PHY109", "MAT101", "CHE109"] },
      { name: "Semester 2", total: "10", courses: ["ENG101", "MAT102", "EEE101"] },
      { name: "Semester 3", total: "14", courses: ["ENG102", "MAT104", "EEE105", "EEE201"] }
    ]
  },
  {
    name: "2nd Year", total: 37, semesters: [
      { name: "Semester 1", total: "13", courses: ["STA102", "EEE102", slot("OGEC-I", 3, "Optional Elective (General Ed.)", "Choose one course from the EEE OGEC pool", "gen_ed", EEE_OGEC_POOL), "GEN226"] },
      { name: "Semester 2", total: "13", courses: [slot("OGEC-II", 3, "Optional Elective (General Ed.)", "Choose one course from the EEE OGEC pool", "gen_ed", EEE_OGEC_POOL), "MAT205", "EEE202", slot("ONEC-I", 3, "Non-Engineering Elective", "Choose one course from the EEE Non-Engineering pool", "open", EEE_NONENG_POOL)] },
      { name: "Semester 3", total: "11", courses: ["PHY209", "EEE204", "EEE205"] }
    ]
  },
  {
    name: "3rd Year", total: 35, semesters: [
      { name: "Semester 1", total: "11", courses: ["EEE301", "EEE306", "EEE303"] },
      { name: "Semester 2", total: "13", courses: ["EEE300", "EEE304", "EEE305", "EEE399"] },
      { name: "Semester 3", total: "11", courses: ["EEE307", "EEE308", "EEE309"] }
    ]
  },
  {
    name: "4th Year", total: "31/37", semesters: [
      { name: "Semester 1", total: "11/12", courses: ["EEE402", "EEE403", slot("ELTV-I", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), "EEE400A"] },
      { name: "Semester 2", total: "11/14", courses: [slot("ELTV-II", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), slot("ELTV-III", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), slot("ELTV-IV", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), "EEE400B"] },
      { name: "Semester 3", total: "09/11", courses: [slot("ELTV-V", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), slot("ELTV-VI", "3/4", "Elective Credits", "Major elective — 3 or 4 credits depending on the course chosen; choose from the EEE ELECT pool", "open", EEE_ELECTIVE_POOL), "EEE400C"] }
    ]
  }
];


const MATH_YEARS = [
  {
    name: "1st Year", total: 32, semesters: [
      { name: "Semester 1", courses: ["ENG101", "MATH111", "MATH112", "MATH115", "PHY112"] },
      { name: "Semester 2", courses: ["ENG102", "MATH114", "MATH116", "MATH117", "STA104"] }
    ]
  },
  {
    name: "2nd Year", total: 32, semesters: [
      { name: "Semester 1", courses: ["GEN201", "MATH211", "MATH212", "PHY212", slot("OGEC001", 3, "Optional Elective (General Ed.)", "Choose one course from the Math OGEC pool. Prerequisite: ENG102", "open", MATH_OGEC_POOL)] },
      { name: "Semester 2", courses: ["MATH214", "STA204", slot("OGEC002", 3, "Optional Elective (General Ed.)", "Choose one course from the Math OGEC pool. Prerequisite: ENG102", "open", MATH_OGEC_POOL), "MATH215", "MATH216"] }
    ]
  },
  {
    name: "3rd Year", total: 32, semesters: [
      { name: "Semester 1", courses: [slot("OBE001", 3, "Optional Business & Economics Course", "Choose one course from the Math OBE pool. Prerequisite: ENG102", "open", MATH_OBE_POOL) ,"MATH311", "MATH312", "MATH314", "MATH315"] },
      { name: "Semester 2", courses: [slot("ECM001", 3, "Elective Modules", "Choose one course from the Math ECM pool. Prerequisite: NONE", "open", MATH_ECM_POOL) ,"MATH316", "MATH317", "MATH318", "MATH319"] }
    ]
  },
  {
    name: "4th Year", total: 34, semesters: [
      { name: "Semester 1", courses: ["MATH411", "MATH412", slot("OBE002", 3, "Optional Business & Economics Course", "Choose one course from the Math OBE pool. Prerequisite: ENG102", "open", MATH_OBE_POOL) ,"MATH415", "MATH499"] },
      { name: "Semester 2", courses: ["MATH414", "MATH416", slot("ECM001", 3, "Elective Modules", "Choose one course from the Math ECM pool. Prerequisite: NONE", "open", MATH_ECM_POOL), slot("ECM003", 3, "Elective Modules", "Choose one course from the Math ECM pool. Prerequisite: NONE", "open", MATH_ECM_POOL), slot("ECM004", 3, "Elective Modules", "Choose one course from the Math ECM pool. Prerequisite: NONE", "open", MATH_ECM_POOL)] }
    ]
  }
];

/* ===== Programs ===== */
const PROGRAMS = {
  cse: {
    key: "cse",
    label: "CSE",
    fullName: "B.Sc. in Computer Science &amp; Engineering",
    catalogLabel: "According to Summer-2018 curriculum · 140 credits · 4 years · 12 semesters",
    totalCredits: 140,
    summary: [
      { label: "Foundation", value: "35 cr" },
      { label: "Core CSE", value: "62 cr" },
      { label: "Major", value: "20 cr" },
      { label: "Non-major electives", value: "8 cr" },
      { label: "Capstone Project", value: "6 cr" }
    ],
    generalEd: GENERAL_ED_POOL,
    majorTracks: CSE_MAJOR_TRACKS,
    trackLabels: CSE_TRACK_LABELS,
    advice: CSE_ADVICE,
    viewType: "roadmap",
    years: CSE_YEARS
  },
  eee: {
    key: "eee",
    label: "EEE",
    fullName: "B.Sc. in Electrical &amp; Electronic Engineering",
    catalogLabel: "According to Summer-2018 curriculum · 140 credits · 4 years · 12 semesters",
    totalCredits: 140,
    summary: [
      { label: "Foundation", value: "12 cr" },
      { label: "Core EEE", value: "93 cr" },
      { label: "Non-major electives", value: "20 cr" },
      { label: "Optionals and Non-Engineering", value: "9 cr" },
      { label: "Capstone Project", value: "6 cr" }
    ],
    generalEd: GENERAL_ED_POOL,
    viewType: "roadmap",
    years: EEE_YEARS,
  },
  math: {
    key: "math",
    label: "MATH",
    fullName: "B.Sc. (Hons.) in Mathematics",
    catalogLabel: "According to Summer-2025 curriculum · 130 credits · 4 years · 8 semesters",
    totalCredits: 130,
    summary: [
      { label: "English foundation", value: "6 cr" },
      { label: "Core Math", value: "85 cr" },
      { label: "General Education Electives", value: "24 cr" },
      { label: "Major Electives", value: "15 cr" }
    ],
    generalEd: MATH_OGED_POOL,
    advice: MATH_ADVICE,
    viewType: "roadmap",
    years: MATH_YEARS,
  }
};

let currentProgram = "cse";
let currentYear = 0;
let currentTrack = "all";
let modal;
let CURRENT_SLOTS = [];

document.addEventListener("DOMContentLoaded", () => {
  modal = new bootstrap.Modal(document.getElementById("courseModal"));
  renderProgramSwitcher();
  loadProgram(currentProgram);
});

function renderProgramSwitcher() {
  const wrap = document.getElementById("programTabs");
  wrap.innerHTML = Object.values(PROGRAMS).map(p => `
    <button class="program-tab ${p.key === currentProgram ? "active" : ""}" data-program="${p.key}">${p.label}</button>`).join("");
  wrap.querySelectorAll(".program-tab").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.program === currentProgram) return;
    currentProgram = btn.dataset.program;
    currentYear = 0;
    currentTrack = "all";
    wrap.querySelectorAll(".program-tab").forEach(b => b.classList.toggle("active", b === btn));
    loadProgram(currentProgram);
  }));
}

function loadProgram(key) {
  const p = PROGRAMS[key];

  document.getElementById("programTitle").innerHTML = p.fullName;
  document.getElementById("programMeta").textContent = p.catalogLabel;

  const creditBox = document.getElementById("creditTotalBox");
  if (p.totalCredits) {
    creditBox.style.display = "";
    document.getElementById("creditTotalNum").textContent = p.totalCredits;
  } else {
    creditBox.style.display = "none";
  }

  document.getElementById("curriculumSummary").innerHTML = p.summary.map(s => `
    <div><span>${s.label}</span><strong>${s.value}</strong></div>`).join("");

  const toolbar = document.getElementById("mapToolbar");
  const trackTabsWrap = document.getElementById("trackTabs");
  if (p.majorTracks) {
    toolbar.querySelector(".toolbar-label").parentElement.style.display = "";
    trackTabsWrap.innerHTML = `<button class="track-tab active" data-track="all">All tracks</button>` +
      Object.keys(p.majorTracks).map(t => `<button class="track-tab" data-track="${t}">${p.trackLabels[t]}</button>`).join("");
    trackTabsWrap.querySelectorAll(".track-tab").forEach(btn => btn.addEventListener("click", () => {
      currentTrack = btn.dataset.track;
      trackTabsWrap.querySelectorAll(".track-tab").forEach(b => b.classList.toggle("active", b === btn));
      renderYear(currentYear);
    }));
  } else {
    toolbar.querySelector(".toolbar-label").parentElement.style.display = "none";
  }
  document.getElementById("mapHelp").innerHTML = `<i class="fa fa-info-circle"></i> Click any course or elective slot to inspect it`;

  const yearNav = document.getElementById("yearNav");
  if (p.viewType === "roadmap") {
    yearNav.style.display = "";
    renderYearNav();
    renderYear(0);
  } else {
    yearNav.style.display = "none";
    renderCatalog(p);
  }
}

function renderYearNav() {
  const p = PROGRAMS[currentProgram];
  const nav = document.getElementById("yearNav");
  nav.innerHTML = p.years.map((y, i) => `
    <button class="year-button ${i === 0 ? "active" : ""}" data-year="${i}">
      ${y.name}<small>${y.total} credits</small>
    </button>`).join("");
  nav.querySelectorAll(".year-button").forEach(btn => btn.addEventListener("click", () => {
    currentYear = Number(btn.dataset.year);
    nav.querySelectorAll(".year-button").forEach(b => b.classList.toggle("active", b === btn));
    renderYear(currentYear);
  }));
}

function renderYear(index) {
  const p = PROGRAMS[currentProgram];
  const y = p.years[index];
  CURRENT_SLOTS = [];
  const noteHtml = (index === 0 && p.note) ? `<div class="catalog-note"><i class="fa fa-exclamation-circle"></i><span>${p.note}</span></div>` : "";
  document.getElementById("yearStage").innerHTML = noteHtml + `
    <div class="year-heading">
      <div><div class="eyebrow">${y.name.toUpperCase()}</div><h2>Degree roadmap</h2></div>
      <p>${y.total} credits in this year</p>
    </div>
    <div class="semesters">${y.semesters.map(renderSemester).join("")}</div>`;
  applyTrackHighlight();
  wireCourseClicks();
}

function renderSemester(s) {
  const totalLabel = s.total !== undefined ? s.total : semesterCredits(s.courses);
  return `<article class="semester">
    <header class="semester-head"><strong>${s.name}</strong><span>${totalLabel} cr</span></header>
    <div class="sem-course-list">${s.courses.map(renderItem).join("")}</div>
  </article>`;
}

function semesterCredits(courses) {
  return courses.reduce((sum, c) => {
    if (typeof c === "string") return sum + (COURSES[c]?.[1] || 0);
    return sum + (typeof c.credits === "number" ? c.credits : 0);
  }, 0);
}

function renderItem(item) {
  if (typeof item !== "string") return renderSlotNode(item);
  const d = COURSES[item];
  const title = d[0] || "Title not listed in source";
  return `<button class="course-node required${d[0] ? "" : " no-title"}" type="button" data-code="${item}">
    <span class="code"><span>${item}</span><span class="credits">${d[1]} cr</span></span>
    <span class="name">${title}</span>
    ${d[2].length ? `<span class="hint">Prereq: ${d[2].join(", ")}</span>` : ""}
  </button>`;
}

function renderSlotNode(item) {
  const idx = CURRENT_SLOTS.length;
  CURRENT_SLOTS.push(item);
  const extra = item.kind === "major" ? " major-slot" : "";
  return `<button class="course-node elective${extra}" type="button" data-slot="${idx}">
    <span class="code"><span>${item.code}</span><span>${item.credits} cr</span></span>
    <span class="name">${item.label}</span>
    <span class="hint">${item.hint}</span>
  </button>`;
}

function wireCourseClicks() {
  document.querySelectorAll(".course-node[data-code]").forEach(n => n.addEventListener("click", () => openCourse(n.dataset.code)));
  document.querySelectorAll(".course-node[data-slot]").forEach(n => n.addEventListener("click", () => openSlot(Number(n.dataset.slot))));
}

function trackName() {
  const p = PROGRAMS[currentProgram];
  return p.trackLabels ? p.trackLabels[currentTrack] : "";
}

function applyTrackHighlight() {
  const p = PROGRAMS[currentProgram];
  if (!p.majorTracks) return;
  const relevant = currentTrack === "all" ? new Set(Object.values(p.majorTracks).flat()) : new Set(p.majorTracks[currentTrack]);
  document.querySelectorAll(".course-node[data-code]").forEach(node => {
    const code = node.dataset.code;
    const allMajor = Object.values(p.majorTracks).flat();
    node.classList.toggle("dim", currentTrack !== "all" && !relevant.has(code) && allMajor.includes(code));
  });
}

/* Flat catalog view — kept for a future program where we only have a course
   list and no confirmed semester plan yet. Neither CSE nor EEE needs it now
   that the EEE flowchart gives a full semester-by-semester layout. */
function renderCatalog(p) {
  CURRENT_SLOTS = [];
  const noteHtml = p.note ? `<div class="catalog-note"><i class="fa fa-exclamation-circle"></i><span>${p.note}</span></div>` : "";

  const coreHtml = p.core ? `
    <div class="catalog-section">
      <div class="year-heading">
        <div><div class="eyebrow">CORE — CONFIRMED SO FAR</div><h2>Required courses</h2></div>
        <p>${p.core.reduce((s, c) => s + COURSES[c][1], 0)} credits shown</p>
      </div>
      <div class="catalog-grid">${p.core.map(c => renderItem(c)).join("")}</div>
    </div>` : "";

  const genEdHtml = `
    <div class="catalog-section">
      <div class="year-heading">
        <div><div class="eyebrow">ELECTIVE POOL</div><h2>General education electives</h2></div>
        <p>Pick as directed by your advising sheet</p>
      </div>
      <div class="pool-grid">${p.generalEd.map(c => `
        <button class="pool-pill" type="button" data-code="${c}"><strong>${c}</strong><span>${COURSES[c][0]}</span></button>`).join("")}
      </div>
    </div>`;

  document.getElementById("yearStage").innerHTML = noteHtml + coreHtml + genEdHtml;
  document.querySelectorAll(".course-node[data-code], .pool-pill[data-code]").forEach(n => n.addEventListener("click", () => openCourse(n.dataset.code)));
}

function openCourse(code) {
  const d = COURSES[code];
  if (!d) return;
  const next = Object.entries(COURSES).filter(([, v]) => v[2].includes(code)).map(([c]) => c);
  document.getElementById("cmPrereqLabel").textContent = "PREREQUISITES";
  document.getElementById("cmNextLabel").textContent = "LEADS TO";
  document.getElementById("cmCode").textContent = code;
  document.getElementById("cmName").textContent = d[0] || "Title not listed in source";
  document.getElementById("cmCredit").textContent = `${d[1]} credit${d[1] === 1 ? "" : "s"}`;
  document.getElementById("cmPrereq").innerHTML = d[2].length
    ? d[2].map(p => `<button class="prereq-pill" data-p="${p}">${p}</button>`).join("")
    : "None listed";
  document.getElementById("cmNext").innerHTML = next.length
    ? next.map(n => `<button class="prereq-pill" data-p="${n}">${n}</button>`).join("")
    : "No direct prerequisite-dependent course in the database.";
  document.getElementById("cmAdvice").textContent = (PROGRAMS[currentProgram].advice && PROGRAMS[currentProgram].advice[code]) || "See the EWU advising criteria for the minimum completed-credit requirement.";
  document.querySelectorAll(".prereq-pill").forEach(b => b.onclick = () => openCourse(b.dataset.p));
  modal.show();
}

function openSlot(idx) {
  const item = CURRENT_SLOTS[idx];
  if (!item) return;
  const p = PROGRAMS[currentProgram];

  let pool = item.pool;
  if (!pool && item.kind === "gen_ed") pool = p.generalEd;
  if (!pool && p.majorTracks && (item.kind === "major" || item.kind === "nonmajor")) {
    const all = Object.values(p.majorTracks).flat();
    if (item.kind === "major") {
      pool = currentTrack === "all" ? all : p.majorTracks[currentTrack];
    } else {
      pool = currentTrack === "all" || !p.majorTracks[currentTrack] ? all : all.filter(c => !p.majorTracks[currentTrack].includes(c));
    }
  }

  document.getElementById("cmPrereqLabel").textContent = "ELIGIBLE COURSES";
  document.getElementById("cmNextLabel").textContent = "SELECTION RULE";
  document.getElementById("cmCode").textContent = item.code;
  document.getElementById("cmName").textContent = item.label;
  document.getElementById("cmCredit").textContent = `${item.credits} credit${item.credits === 1 ? "" : "s"} · elective slot`;
  document.getElementById("cmPrereq").innerHTML = pool && pool.length
    ? pool.map(c => `<button class="prereq-pill" data-p="${c}">${c}</button>`).join("")
    : "Not listed in the source yet — check your official EWU advising sheet for eligible courses.";
  document.getElementById("cmNext").textContent = item.hint;
  document.getElementById("cmAdvice").textContent = "Elective slot — pick one course that satisfies this requirement and hasn't already been counted toward another slot.";
  document.querySelectorAll(".prereq-pill").forEach(b => b.onclick = () => openCourse(b.dataset.p));
  modal.show();
}

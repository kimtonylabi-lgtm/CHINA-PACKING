import './style.css';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Noto Sans KR font base64 (Subset for PDF) - Using standard fonts for now to avoid large base64

// Noto Sans KR font base64 (Subset for PDF) - Using standard fonts for now to avoid large base64
// We will use standard font and english labels for PDF temporarily or try to load font
const FONT_URL = "https://fonts.gstatic.com/s/notosanskr/v13/PbykFmXiEBPT4ITbgNA5Cgms3nYt.ttf";

// Helper for loading font (advanced usage, might need CORS setup if external)
// For simplicity in MVP, we might use default fonts or a CDN font if possible.

// 1. Data Store
const containerData = [
  {
    id: 1,
    name: '플라스틱 용기 (일반)',
    material: 'PP, PE, PET 등',
    duty: '기본 6.5~8% (FTA 2.1~4.6%)',
    inspection: '저렴~중간 (11~59만원/재질별)',
    features: '화장품용은 인증 불필요, 식품용은 정밀검사 필수',
    recommend: '로션, 토너, 샴푸, 크림',
    status: '대중적'
  },
  {
    id: 2,
    name: '유리 용기 (앰플/공병)',
    material: '투명/착색 유리',
    duty: '기본 8% (FTA 0% 가능)',
    inspection: '매우 저렴 (투명 0원, 착색 11만원)',
    features: '파손 주의 포장 필수, 원산지 표기 주의',
    recommend: '고가 세럼, 앰플, 향수, 디퓨저',
    status: '프리미엄'
  },
  {
    id: 3,
    name: '스테인리스 텀블러',
    material: '본체(스텐), 뚜껑(PP/고무)',
    duty: '기본 8% (품목별 협정세율 확인)',
    inspection: '비쌈 (복합재질 합산 약 92만원)',
    features: '식품 닿는 모든 부위 개별 검사, 재생재질 금지',
    recommend: '판촉물, 브랜드 굿즈, 카페 용품',
    status: '주의필요'
  },
  {
    id: 4,
    name: '에어리스/특수 펌프',
    material: '복합 플라스틱 (PP, AS 등)',
    duty: '기본 8% (품목별 협정세율 확인)',
    inspection: '비쌈 (부속품 재질별 합산)',
    features: '구조 복잡하여 불량률 관리 중요, 기능성 테스트 필요',
    recommend: '기능성 화장품, 산화 방지 제품',
    status: '고기능성'
  }
];

const sourcingTips = [
  {
    title: "용도에 따른 '한 끗 차이'",
    icon: "⚖️",
    content: "화장품 용기는 인증이 없어도 되지만, 텀블러/쉐이커 등 <strong>식품용 기구</strong>는 식약처 정밀검사 대상입니다. 예산을 넉넉히 잡으세요."
  },
  {
    title: "FTA로 관세 0% 도전",
    icon: "💰",
    content: "유리 용기는 <strong>한중 FTA 적용 시 관세 0%</strong>입니다. 공급업체가 원산지 증명서(Co) 발급이 가능한지 꼭 확인하세요."
  },
  {
    title: "MOQ 협상의 기술",
    icon: "🤝",
    content: "초기엔 <strong>'기성 금형(공유 금형)'</strong>이나 도매 플랫폼 재고를 활용하여 MOQ를 500~1,000개 수준으로 낮춰 시작해보세요."
  },
  {
    title: "품질 검수(QC)는 필수",
    icon: "🔍",
    content: "불량품이 한국에 오면 반품비가 더 듭니다. 선적 전 현지 검수를 통해 불량을 미리 걸러내는 것이 비용을 아끼는 길입니다."
  }
];
// Project Data State
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let activeProjectId = null;

// Save to LocalStorage helper
const saveProjects = () => {
  localStorage.setItem('projects', JSON.stringify(projects));
};

// 2. Main Logic
let currentFilter = 'all'; // Store current filter state

window.setProjectFilter = (filterType) => {
  currentFilter = filterType;
  renderProjectList();

  // Update active class in sidebar (if sidebar.js updates UI, we might duplicate or coordinate. 
  // Sidebar.js updates its own UI. We just handle data rendering here.)
  // However, if we refresh, sidebar state might be lost. 
  // For now, let sidebar.js handle UI and call window.setProjectFilter.
};

function renderProjectList() {
  const listContainer = document.getElementById('project-list');
  if (!listContainer) return;

  let filteredProjects = projects;
  if (currentFilter !== 'all') {
    filteredProjects = projects.filter(p => {
      const status = p.status || 'ongoing';
      return status === currentFilter;
    });
  }

  if (filteredProjects.length === 0) {
    if (projects.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
            생성된 프로젝트가 없습니다.<br>새로운 소싱 프로젝트를 시작해보세요.
        </div>
        `;
    } else {
      listContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
            해당 상태의 프로젝트가 없습니다.
        </div>
        `;
    }
    return;
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return '완료';
      case 'hold': return '보류';
      default: return '진행중';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981'; // Green
      case 'hold': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'completed': return 'rgba(16, 185, 129, 0.1)';
      case 'hold': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  };

  listContainer.innerHTML = filteredProjects.map(p => {
    const status = p.status || 'ongoing';
    const label = getStatusLabel(status);
    const color = getStatusColor(status);
    const bg = getStatusBg(status);

    return `
    <div class="card project-card" onclick="window.openProject('${p.id}')" style="cursor: pointer; display: flex; flex-direction: column;">
      ${p.image ? `<img src="${p.image}" class="project-thumb" alt="Project Image">` : `<div class="project-thumb-placeholder">📁</div>`}
      
      <h3 style="margin-bottom: 0.5rem; margin-top: 1rem;">${p.name || '이름 없는 프로젝트'}</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: auto;">
        등록 업체: <strong style="color: var(--primary);">${p.suppliers.length}</strong>개
      </p>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4);">
            ${status === 'completed' ? '프로젝트 완료' : (status === 'hold' ? '일시 중단' : '진행중')}
        </span>
        <div style="background: ${bg}; color: ${color}; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: 1px solid ${color};">
          ${label}
        </div>
      </div>
    </div>
  `}).join('');

  updateSidebarCounts();
}

function updateSidebarCounts() {
  const allCount = projects.length;
  const ongoingCount = projects.filter(p => !p.status || p.status === 'ongoing').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const holdCount = projects.filter(p => p.status === 'hold').length;

  const setBadge = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.innerText = count;
  };

  setBadge('count-all', allCount);
  setBadge('count-ongoing', ongoingCount);
  setBadge('count-completed', completedCount);
  setBadge('count-hold', holdCount);
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = containerData.map(item => `
  < tr >
      <td>
        <div style="font-weight: 700; color: var(--text-main);">${item.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${item.material}</div>
      </td>
      <td>${item.duty}</td>
      <td>${item.inspection}</td>
      <td style="font-size: 0.875rem;">${item.features}</td>
      <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
    </tr >
  `).join('');
}

function renderGrid() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = containerData.map(item => `
    <div class="card">
      <div class="badge ${getStatusClass(item.status)}" style="position: absolute; top: 1rem; right: 1rem;">${item.status}</div>
      <h3>${item.name}</h3>
      <p class="specs" style="margin-bottom: 0.5rem; color: var(--primary);">${item.recommend}</p>
      <div class="info-row">
        <span>관세율</span>
        <span style="color: var(--text-main);">${item.duty}</span>
      </div>
      <div class="info-row">
        <span>식검비용</span>
        <span style="color: var(--text-main);">${item.inspection}</span>
      </div>
      <p style="font-size: 0.875rem; color: #94a3b8; margin-top: 1rem; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.8rem;">
        ${item.features}
      </p>
      <button class="btn-primary" style="width: 100%; margin-top: auto;">상세 가이드 보기</button>
    </div>
  `).join('');
}

function renderTips() {
  const tipsContainer = document.getElementById('tips-grid');
  if (!tipsContainer) return;

  tipsContainer.innerHTML = sourcingTips.map(tip => `
    <div class="card tip-card">
      <div style="font-size: 2rem; margin-bottom: 1rem;">${tip.icon}</div>
      <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${tip.title}</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
        ${tip.content}
      </p>
    </div>
  `).join('');
}

// 3. Project Supplier Logic

// Helper for Progress Bar
const progressSteps = ['용기서칭', '견적/샘플의뢰', '견적확인', '샘플확인', '고객사 발송완료'];

window.updateSupplierStatus = (supplierIndex, stepIndex) => {
  if (!activeProjectId) return;
  const projectIndex = projects.findIndex(p => p.id === activeProjectId);
  if (projectIndex === -1) return;

  const currentStatus = projects[projectIndex].suppliers[supplierIndex].status || 0;

  // Toggle off if clicking the same last step? No, usually just set to that step.
  // Let's allow setting to any step.
  projects[projectIndex].suppliers[supplierIndex].status = stepIndex;

  saveProjects();
  renderSupplierTable(); // Re-render to show update
};

// 3. Project Supplier Logic
function renderSupplierTable() {
  const container = document.getElementById('supplier-list');
  const emptyState = document.getElementById('empty-state');

  // Find Active Project
  const activeProject = projects.find(p => p.id === activeProjectId);
  if (!activeProject) return;

  const suppliers = activeProject.suppliers || [];

  if (suppliers.length === 0) {
    emptyState.style.display = 'block';
    container.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = suppliers.map((supplier, index) => {
    const currentStatus = supplier.status !== undefined ? supplier.status : 0; // Default 0

    // Generate Progress Steps HTML
    const progressHtml = progressSteps.map((step, stepIdx) => {
      const isActive = stepIdx <= currentStatus;
      const isCompleted = stepIdx < currentStatus;
      const activeClass = isActive ? 'active' : '';
      const completedClass = isCompleted ? 'completed' : '';

      return `
         <div class="progress-step ${activeClass} ${completedClass}" onclick="window.updateSupplierStatus(${index}, ${stepIdx})">
           <div class="step-circle" title="${step}"></div>
           <span class="step-label">${step}</span>
         </div>
       `;
    }).join('');

    // Format Date
    let dateStr = '-';
    if (supplier.lastUpdated) {
      const date = new Date(supplier.lastUpdated);
      dateStr = date.toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return `
    <div class="card supplier-card" data-row-index="${index}">
      <div class="supplier-card-header">
        ${supplier.image ? `<img src="${supplier.image}" class="card-thumb" alt="Product Image">` : `<div class="card-thumb-placeholder">📷</div>`}
        <h4 style="flex:1; margin:0;"><input type="text" data-field="name" value="${supplier.name}" onchange="window.updateSupplier(${index}, 'name', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'name')" placeholder="업체명"></h4>
        <button class="delete-card" onclick="window.deleteSupplier(${index})">🗑️</button>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-tracker">
         ${progressHtml}
      </div>
      
      <div class="supplier-details-grid">
        <div class="detail-item">
          <span class="detail-label">단가 (RMB/KRW)</span>
          <div class="detail-value"><input type="text" data-field="price" value="${supplier.price}" oninput="this.value = window.formatNumber(this.value)" onchange="window.updateSupplier(${index}, 'price', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'price')" placeholder="0"></div>
        </div>
        <div class="detail-item">
          <span class="detail-label">MOQ</span>
          <div class="detail-value"><input type="text" data-field="moq" value="${supplier.moq}" oninput="this.value = window.formatNumber(this.value)" onchange="window.updateSupplier(${index}, 'moq', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'moq')" placeholder="0"></div>
        </div>
        <div class="detail-item">
          <span class="detail-label">금형비</span>
          <div class="detail-value"><input type="text" data-field="moldCost" value="${supplier.moldCost}" oninput="this.value = window.formatNumber(this.value)" onchange="window.updateSupplier(${index}, 'moldCost', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'moldCost')" placeholder="0"></div>
        </div>
        <div class="detail-item">
          <span class="detail-label">샘플비</span>
          <div class="detail-value"><input type="text" data-field="sampleCost" value="${supplier.sampleCost}" oninput="this.value = window.formatNumber(this.value)" onchange="window.updateSupplier(${index}, 'sampleCost', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'sampleCost')" placeholder="0"></div>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-label">납기 (Lead Time)</span>
        <div class="detail-value"><input type="text" data-field="leadTime" value="${supplier.leadTime}" onchange="window.updateSupplier(${index}, 'leadTime', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'leadTime')" placeholder="예: 4주"></div>
      </div>

      <div class="supplier-note">
        <input type="text" data-field="note" value="${supplier.note}" onchange="window.updateSupplier(${index}, 'note', this.value)" onkeydown="window.handleKeyDown(event, ${index}, 'note')" placeholder="비고 / 평가 메모...">
      </div>

      <!-- Status Footer -->
      <div class="status-footer">
        <span style="opacity:0.75">현재 진행:</span>
        <span class="status-badge">${progressSteps[currentStatus]}</span>
        <span style="font-size: 0.8rem; opacity: 0.5; margin-left: auto;">${dateStr != '-' ? 'Updated ' + dateStr : ''}</span>
      </div>
    </div>
  `}).join('');
}


// Project Management Functions
window.openProjectModal = () => {
  document.getElementById('project-modal').style.display = 'flex';
  document.getElementById('project-modal-name').focus();
};

window.closeProjectModal = () => {
  document.getElementById('project-modal').style.display = 'none';
  document.getElementById('project-modal-name').value = '';
  document.getElementById('project-modal-image').value = '';
};

window.createProjectFromModal = () => {
  const name = document.getElementById('project-modal-name').value;
  if (!name) {
    alert("프로젝트 이름을 입력하세요.");
    return;
  }

  const fileInput = document.getElementById('project-modal-image');
  const file = fileInput.files[0];

  const doCreate = (imgData) => {
    const newProject = {
      id: Date.now().toString(),
      name: name,
      suppliers: [],
      image: imgData || null
    };
    projects.push(newProject);
    saveProjects();
    renderProjectList();
    window.closeProjectModal();
    window.openProject(newProject.id);
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      doCreate(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    doCreate(null);
  }
};

window.createProjectPrompt = undefined; // Deprecated

window.openProject = (id) => {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  activeProjectId = id;

  // Update view
  document.getElementById('project-list-view').style.display = 'none';
  document.getElementById('project-detail-view').style.display = 'block';

  // Set project name
  const nameInput = document.getElementById('project-name');
  if (nameInput) nameInput.value = project.name;

  // Set project status
  const statusSelect = document.getElementById('project-status');
  if (statusSelect) {
    statusSelect.value = project.status || 'ongoing'; // Default to ongoing
    updateStatusSelectStyle(statusSelect);
  }

  renderSupplierTable();
};

window.closeProjectView = () => {
  activeProjectId = null;
  document.getElementById('project-list-view').style.display = 'block';
  document.getElementById('project-detail-view').style.display = 'none';
  renderProjectList();
};

window.updateProjectName = (newName) => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (project) {
    project.name = newName;
    saveProjects();
  }
};

window.updateProjectStatus = (newStatus) => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (project) {
    project.status = newStatus;
    saveProjects();

    // Optional: Visual feedback or style change based on status
    const statusSelect = document.getElementById('project-status');
    updateStatusSelectStyle(statusSelect);
  }
};

function updateStatusSelectStyle(selectElement) {
  if (!selectElement) return;
  const val = selectElement.value;
  if (val === 'completed') {
    selectElement.style.borderColor = '#10b981';
    selectElement.style.color = '#10b981';
  } else if (val === 'hold') {
    selectElement.style.borderColor = '#ef4444';
    selectElement.style.color = '#ef4444';
  } else {
    selectElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    selectElement.style.color = 'var(--text-main)';
  }
}

window.deleteCurrentProject = () => {
  if (!activeProjectId) return;
  if (confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) {
    projects = projects.filter(p => p.id !== activeProjectId);
    saveProjects();
    window.closeProjectView();
  }
};

// Make helper functions globally available
window.openModal = () => {
  if (!activeProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return;
  }
  document.getElementById('supplier-modal').style.display = 'flex';
  document.getElementById('modal-name').focus();
};

window.closeModal = () => {
  document.getElementById('supplier-modal').style.display = 'none';
  // Clear inputs
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-price').value = '';
  document.getElementById('modal-moq').value = '';
  document.getElementById('modal-moldCost').value = '';
  document.getElementById('modal-sampleCost').value = '';
  document.getElementById('modal-leadTime').value = '';
  document.getElementById('modal-note').value = '';
  document.getElementById('modal-image').value = ''; // Clear file input
};

window.saveSupplierFromModal = () => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;

  const name = document.getElementById('modal-name').value;
  if (!name) {
    alert('업체명을 입력해주세요.');
    return;
  }

  const fileInput = document.getElementById('modal-image');
  const file = fileInput.files[0];

  const doSave = (imgData) => {
    project.suppliers.push({
      name: name,
      price: document.getElementById('modal-price').value,
      moq: document.getElementById('modal-moq').value,
      moldCost: document.getElementById('modal-moldCost').value,
      sampleCost: document.getElementById('modal-sampleCost').value,
      leadTime: document.getElementById('modal-leadTime').value,
      note: document.getElementById('modal-note').value,
      image: imgData || null
    });

    saveProjects();
    renderSupplierTable();
    window.closeModal();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      doSave(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    doSave(null);
  }
};

window.updateSupplier = (index, field, value) => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (project && project.suppliers[index]) {
    project.suppliers[index][field] = value;
    saveProjects();
  }
};

window.deleteSupplier = (index) => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (project) {
    project.suppliers.splice(index, 1);
    saveProjects();
    renderSupplierTable();
  }
};

window.handleKeyDown = (event, index, field) => {
  // Keep existing table navigation logic for edits
  // Updated for Card Layout traversal
  if (event.key === 'Enter') {
    event.preventDefault();
    const fields = ['name', 'price', 'moq', 'moldCost', 'sampleCost', 'leadTime', 'note'];
    const currentFieldIndex = fields.indexOf(field);

    if (currentFieldIndex < fields.length - 1) {
      const nextField = fields[currentFieldIndex + 1];
      const card = document.querySelector(`.supplier - card[data - row - index="${index}"]`);
      if (card) {
        const nextInput = card.querySelector(`input[data - field= "${nextField}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  }
};

window.resetProject = undefined; // Deprecated

// 4. Utilities
window.formatNumber = (value) => {
  if (!value) return '';
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return value; // In case of non-numeric chars being only content (unlikely with regex) or allowing some text
  return new Intl.NumberFormat('ko-KR').format(parseInt(num, 10));
};

function getStatusClass(status) {
  switch (status) {
    case '대중적': return 'badge-blue';
    case '프리미엄': return 'badge-gold';
    case '고기능성': return 'badge-green';
    case '주의필요': return 'badge-red';
    default: return '';
  }
}

// Export Functions
// Export Functions
// Export Functions
window.exportToPDF = async () => {
  if (!activeProjectId) return;
  const project = projects.find(p => p.id === activeProjectId);
  if (!project || project.suppliers.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }

  // Feedback UI
  const btn = document.querySelector('button[onclick="window.exportToPDF()"]');
  const originalText = btn.innerText;
  btn.innerText = "생성 중...";
  btn.disabled = true;

  try {
    // 1. Create a temporary container for PDF rendering (Landscape A4)
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '0';
    // A4 Landscape: 297mm x 210mm. 
    // We set width slightly less to ensure padding fits.
    pdfContainer.style.width = '297mm';
    pdfContainer.style.minHeight = '210mm';
    pdfContainer.style.padding = '15mm';
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.color = '#1e293b';
    pdfContainer.style.fontFamily = "'Pretendard', 'Noto Sans KR', sans-serif";
    pdfContainer.style.boxSizing = 'border-box';
    document.body.appendChild(pdfContainer);

    // 2. Build HTML Content (Transposed Matrix)
    const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Data preparation
    const columns = project.suppliers;
    const colWidth = `${80 / columns.length}%`; // Distribute remaining 80% width among suppliers. Label column gets 20%.

    let htmlContent = `
         <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            <div style="display:flex; flex-direction:column;">
              <h1 style="font-size: 72px; margin: 0; font-weight: 800; color: #1e293b; line-height: 1;">${project.name}</h1>
              <span style="font-size: 14px; color: #64748b; margin-top:10px;">업체 비교 분석 보고서</span>
            </div>
            <span style="color: #64748b; font-size: 12px;">${dateStr}</span>
         </div>
         
         <table style="width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed;">
             <colgroup>
                <col style="width: 120px; background-color: #f8fafc;">
                ${columns.map(() => `<col>`).join('')}
             </colgroup>
             <tbody>
     `;

    // Row Generators
    const generateRow = (label, dataFn, isImage = false) => {
      let rowHtml = `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 700; color: #475569; border: 1px solid #e2e8f0; vertical-align: middle;">${label}</td>`;

      columns.forEach(s => {
        const content = dataFn(s);
        if (isImage) {
          rowHtml += `
                  <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                    ${content ? `<img src="${content}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;">` : `<div style="width: 120px; height: 120px; background: #f1f5f9; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center; color:#94a3b8;">No Image</div>`}
                  </td>`;
        } else {
          rowHtml += `<td style="padding: 12px; border: 1px solid #e2e8f0; vertical-align: middle; word-break: break-all;">${content || '-'}</td>`;
        }
      });
      rowHtml += `</tr>`;
      return rowHtml;
    };

    // 1. Image Row
    htmlContent += generateRow('제품 이미지', s => s.image, true);
    // 2. Name Row
    htmlContent += generateRow('업체명', s => `<span style="font-weight:700; font-size:14px; color:#0f172a;">${s.name}</span>`);
    // 3. Price Row
    htmlContent += generateRow('단가', s => `<span style="color:#2563eb; font-weight:600;">${s.price}</span>`);
    // 4. MOQ
    htmlContent += generateRow('MOQ', s => s.moq);
    // 5. Mold Cost
    htmlContent += generateRow('금형비', s => s.moldCost);
    // 6. Sample Cost
    htmlContent += generateRow('샘플비', s => s.sampleCost);
    // 7. Lead Time
    htmlContent += generateRow('납기', s => s.leadTime);
    // 8. Note
    htmlContent += generateRow('비고', s => `<span style="color:#64748b; font-size:11px;">${s.note}</span>`);

    htmlContent += `
             </tbody>
         </table>
         
         <div style="margin-top: 20px; text-align: right; color: #cbd5e1; font-size: 10px;">
           Pro Sourcing Manager
         </div>
     `;

    pdfContainer.innerHTML = htmlContent;

    // 3. Capture with html2canvas (Landscape optimized)
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // 4. Generate PDF (Landscape)
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for Landscape
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate Image Fit
    const imgWidth = pdfWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

    pdf.save(`${project.name}_비교견적서.pdf`);

    // Cleanup
    document.body.removeChild(pdfContainer);

  } catch (error) {
    console.error("PDF Export failed:", error);
    alert("PDF 생성 중 오류가 발생했습니다: " + error.message);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};


// 5. Init
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  renderGrid();
  renderTips();

  // Initial Load
  renderProjectList(); // Now defaults to project list

  // Event Listeners
  document.getElementById('start-project-btn')?.addEventListener('click', () => {
    document.getElementById('project-section').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('view-guide-btn')?.addEventListener('click', () => {
    document.getElementById('guide-section').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('add-supplier-btn')?.addEventListener('click', window.openModal);

  // Modal Close on Background Click
  document.getElementById('supplier-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'supplier-modal') {
      window.closeModal();
    }
  });

  document.getElementById('project-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') {
      window.closeProjectModal();
    }
  });

  // Project Modal Enter Key
  document.getElementById('project-modal-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.createProjectFromModal();
    }
  });

  // Modal Input Enter Key Navigation & Number Formatting
  const modalInputs = [
    'modal-name',
    'modal-price',
    'modal-moq',
    'modal-moldCost',
    'modal-sampleCost',
    'modal-leadTime',
    'modal-note'
  ];

  modalInputs.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Formatting for number inputs
    if (el.classList.contains('number-input')) {
      el.addEventListener('input', (e) => {
        e.target.value = window.formatNumber(e.target.value);
      });
    }

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (index < modalInputs.length - 1) {
          const nextInput = document.getElementById(modalInputs[index + 1]);
          if (nextInput) nextInput.focus();
        } else {
          // Last input (note) -> Save
          window.saveSupplierFromModal();
        }
      }
    });
  });
});

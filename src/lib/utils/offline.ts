/**
 * Utilitários para gerenciamento offline e PWA
 */

// Declarar a interface expandida do ServiceWorkerRegistration para incluir propriedades do BackgroundSync
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
}

// Registra o service worker para funcionalidades offline
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration.scope);
          
          // Verificar atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('Novo Service Worker instalando...');
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Nova versão disponível!');
                  // Notificar o usuário sobre a atualização
                  notifyUserAboutUpdate();
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Erro ao registrar o Service Worker:', error);
        });
    });
  }
}

// Gerenciar estado da conexão
export function setupOfflineDetection(
  onOffline: () => void = () => {},
  onOnline: () => void = () => {}
) {
  // Estado inicial baseado no navegador
  const isOffline = !navigator.onLine;
  let offlineState = isOffline;
  
  if (isOffline) {
    onOffline();
  }
  
  // Função para verificar a conexão real com o servidor
  const checkRealConnection = async () => {
    try {
      // Use um endpoint simples e rápido
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const online = response.ok;
      
      // Atualizar o estado se mudou
      if (online && offlineState) {
        offlineState = false;
        onOnline();
        syncDataWhenOnline();
      } else if (!online && !offlineState) {
        offlineState = true;
        onOffline();
      }
      
      return online;
    } catch (error) {
      console.warn('Erro ao verificar conexão real:', error);
      
      // Se houve erro, provavelmente está offline
      if (!offlineState) {
        offlineState = true;
        onOffline();
      }
      
      return false;
    }
  };
  
  // Verificar conexão real periodicamente (a cada 30 segundos)
  const intervalId = setInterval(checkRealConnection, 30000);
  
  // Verificar imediatamente a conexão real
  checkRealConnection();
  
  // Monitorar mudanças de conexão do navegador
  window.addEventListener('offline', () => {
    console.log('Navegador detectou que dispositivo está offline');
    offlineState = true;
    onOffline();
  });
  
  window.addEventListener('online', () => {
    console.log('Navegador detectou que dispositivo está online novamente');
    // Não alterar estado imediatamente, verificar a conexão real
    checkRealConnection().then(isReallyOnline => {
      if (isReallyOnline) {
        // Se realmente estiver online, sincronizar dados
    syncDataWhenOnline();
      }
    });
  });
  
  // Cleanup function
  const cleanup = () => {
    clearInterval(intervalId);
  };
  
  return { isOffline: offlineState, checkConnection: checkRealConnection, cleanup };
}

// Sincronização de dados quando a conexão voltar
function syncDataWhenOnline() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(registration => {
        // Cast para o tipo estendido que inclui a API de sincronização
        const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
        extendedRegistration.sync.register('sync-pending-data')
          .then(() => {
            console.log('Sincronização em background registrada para dados pendentes');
          })
          .catch((err: Error) => {
            console.error('Erro ao registrar sincronização em background:', err);
          });
      });
  } else {
    // Fallback para browsers que não suportam Background Sync
    console.log('Background Sync não é suportado, sincronizando dados manualmente');
    syncPendingData();
  }
}

// Sincronização manual (fallback)
async function syncPendingData() {
  try {
    const db = await openDatabase();
    const pendingRequests = await db.getAll('pendingRequests');
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        if (response.ok) {
          await db.delete('pendingRequests', request.id);
        }
      } catch (err) {
        console.error('Erro ao sincronizar dados pendentes:', err);
      }
    }
  } catch (err) {
    console.error('Erro ao abrir banco de dados para sincronização:', err);
  }
}

// Salva uma solicitação para sincronização posterior
export async function saveRequestForLater(request: Request) {
  try {
    const db = await openDatabase();
    
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.clone().text(),
      timestamp: Date.now()
    };
    
    await db.add('pendingRequests', requestData);
    console.log('Solicitação salva para sincronização posterior');
    
    return true;
  } catch (err) {
    console.error('Erro ao salvar solicitação para sincronização:', err);
    return false;
  }
}

// Verificar se existem dados pendentes de sincronização
export async function hasPendingSync() {
  try {
    const db = await openDatabase();
    const count = await db.count('pendingRequests');
    return count > 0;
  } catch (err) {
    console.error('Erro ao verificar dados pendentes:', err);
    return false;
  }
}

// Helper para abrir o IndexedDB
function openDatabase() {
  return new Promise<{
    db: IDBDatabase;
    getAll: (storeName: string) => Promise<any[]>;
    add: (storeName: string, data: any) => Promise<number>;
    delete: (storeName: string, key: number) => Promise<void>;
    count: (storeName: string) => Promise<number>;
  }>((resolve, reject) => {
    const dbRequest = indexedDB.open('medjourney-offline', 1);
    
    dbRequest.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    dbRequest.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      resolve({
        db,
        
        getAll: (storeName: string) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        },
        
        add: (storeName: string, data: any) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
          });
        },
        
        delete: (storeName: string, key: number) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        },
        
        count: (storeName: string) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
          });
        }
      });
    };
    
    dbRequest.onerror = event => reject((event.target as IDBOpenDBRequest).error);
  });
}

// Notifica o usuário sobre atualização do service worker
function notifyUserAboutUpdate() {
  // Implementar uma notificação visual para o usuário
  // Ex: exibir um toast ou banner
  const event = new CustomEvent('serviceWorkerUpdateAvailable');
  window.dispatchEvent(event);
}

/**
 * Verifica se o servidor está disponível
 * @returns Promise<boolean> true se o servidor estiver disponível
 */
export async function isServerAvailable(): Promise<boolean> {
  try {
    // Tentar fazer uma requisição simples para o servidor
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'pragma': 'no-cache',
        'cache-control': 'no-cache'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do servidor:', error);
    return false;
  }
}

/**
 * Função para garantir a URL correta do servidor
 * Resolve problemas com IPs locais incorretos em requisições
 */
export function getCorrectServerUrl(path: string = '/'): string {
  try {
    // Verificar se estamos em um ambiente de navegador
    if (typeof window === 'undefined') {
      return path;
    }

    // Obter a URL atual do window.location
    const currentHost = window.location.host;
    const currentOrigin = window.location.origin;
    
    // Verificar se estamos tentando usar IP local em vez de hostname
    const isIpAddress = /^(http|https):\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(currentOrigin);
    
    // Se a URL contiver um IP local específico que não corresponde ao host atual, corrigi-la
    if (isIpAddress) {
      console.warn(`Detectado uso de IP (${currentOrigin}) em vez de hostname. Usando window.location.origin para garantir consistência.`);
    }
    
    // Garantir que o caminho comece com /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Construir a URL completa com o origin atual
    return new URL(normalizedPath, currentOrigin).toString();
  } catch (error) {
    console.error('Erro ao normalizar URL do servidor:', error);
    
    // Retornar uma URL relativa como fallback
    return path.startsWith('/') ? path : `/${path}`;
  }
} 
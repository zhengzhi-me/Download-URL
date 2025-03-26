// 创建上下文菜单项
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'downloadUrlAsHtml',
    title: '下载URL为HTML文件',
    contexts: ['page', 'link']
  });
});

// 处理上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'downloadUrlAsHtml') {
    // 如果点击的是链接，则下载链接URL
    if (info.linkUrl) {
      console.log('000000')
      // 直接使用链接URL和默认标题，避免跨域访问问题
      downloadUrlAsHtml(info.linkUrl, new URL(info.linkUrl).hostname || 'Webpage');
    } else {
      // 否则下载当前页面URL
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getPageInfo
      }).then(results => {
        if (results && results[0] && results[0].result) {
          console.log('121212', results)
          downloadUrlAsHtml(tab.url, results[0].result.title);
        } else {
          console.log('67890')
          downloadUrlAsHtml(tab.url, 'Webpage');
        }
      }).catch(error => {
        console.error('执行脚本时出错:', error);
        console.log('97897897898')
        downloadUrlAsHtml(tab.url, new URL(tab.url).hostname || 'Webpage');
      });
    }
  }
});

// 处理工具栏图标点击事件
// 新增状态跟踪对象
const tabStatus = new Map();

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 只要有标题就可以触发下载，不必等待页面完全加载
  if (changeInfo.title) {
    tabStatus.set(tabId, true);
    chrome.action.setBadgeText({ 
      tabId,
      text: '↓'
    });
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: '#F83039'
    });
  } else if (changeInfo.status === 'complete' && !tabStatus.get(tabId)) {
    // 如果页面加载完成但还没有设置状态，尝试获取标题
    chrome.scripting.executeScript({
      target: { tabId },
      func: getPageInfo
    }).then(results => {
      if (results[0]?.result?.title) {
        tabStatus.set(tabId, true);
        chrome.action.setBadgeText({ 
          tabId,
          text: '↓'
        });
        chrome.action.setBadgeBackgroundColor({
          tabId,
          color: '#F83039'
        });
      }
    }).catch(error => {
      console.log('无法访问页面内容，可能是权限问题:', error);
      // 即使有错误，也允许下载，使用URL的主机名作为标题
      tabStatus.set(tabId, true);
      chrome.action.setBadgeText({ 
        tabId,
        text: '↓'
      });
      chrome.action.setBadgeBackgroundColor({
        tabId,
        color: '#F83039'
      });
    });
  }
});

// 修改后的工具栏点击处理
chrome.action.onClicked.addListener((tab) => {
  if (!tabStatus.get(tab.id)) return;
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getPageInfo
  }).then(results => {
    if (results[0]?.result?.title) {
      console.log('1234567', results)
      downloadUrlAsHtml(tab.url, results[0].result.title);
    } else {
      console.log('8888888')
      downloadUrlAsHtml(tab.url, new URL(tab.url).hostname || 'Webpage');
    }
  }).catch(error => {
    console.log('无法访问页面内容，使用默认标题:', error);
    // 使用URL的主机名作为标题
    console.log('9999')
    downloadUrlAsHtml(tab.url, new URL(tab.url).hostname || 'Webpage');
  });
});

// 获取页面信息的函数，增强SEO标题获取逻辑
function getPageInfo() {
  // 扩展SEO检测范围，包含更多meta标签
  const seoSelector = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'meta[itemprop="name"]'
  ].join(',');
  
  const seoMeta = document.querySelector(seoSelector);
  return {
    title: seoMeta?.content || document.title || document.location.hostname
  };
}

// 文件名清理函数
function sanitizeFilename(filename) {
  if (!filename) return 'webpage';
  
  // 确保中文字符被保留，只替换文件系统不允许的字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // 替换不允许的字符为下划线
    .replace(/^\s+|\s+$/g, '') // 去除首尾空格
    .replace(/_+/g, '_') // 合并连续下划线
    .substring(0, 200) // 限制长度
    .trim() || 'webpage'; // 确保最终回退值有效
}


let currentFilename = "upload.html";

function onDeterminingFilename(item, suggest) {
  console.log("原始文件名：", item.filename);
  // 根据自己的需求修改文件名，这里示例为将文件放到 "custom_dir" 文件夹下

  const newFilename = currentFilename;

  console.log("新文件名：", newFilename);
  suggest({ filename: newFilename });
}


// 下载函数
function downloadUrlAsHtml(url, title) {
  const safeTitle = sanitizeFilename(title);
  console.log('123', url, '生成文件名:', safeTitle, '原始标题:', title); // 增强调试日志

  const htmlContent = `<!DOCTYPE html><meta charset="UTF-8"><title>${title}</title><meta http-equiv="refresh" content="0;url=${url}">`;
  const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent);

  // 修改当前下载的文件名
  currentFilename = safeTitle + '.html';
  // 通过监听 chrome.downloads.onDeterminingFilename 事件，你可以在下载开始前动态修改文件名，这样可以确保最终保存的是你期望的名称。
  // 移除之前注册的监听器，防止重复注册
  chrome.downloads.onDeterminingFilename.removeListener(onDeterminingFilename);
  chrome.downloads.onDeterminingFilename.addListener(onDeterminingFilename);

  // 直接下载，不检查现有文件
  chrome.downloads.download({
    url: dataUrl,
    // filename: '123.html',
    // conflictAction: 'overwrite', // 自动处理文件名冲突
    // saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('下载错误:', chrome.runtime.lastError);
      // 如果下载失败，尝试使用更简单的文件名
      chrome.downloads.download({
        url: dataUrl,
        // filename: 'webpage.html',
        // conflictAction: 'uniquify',
        // saveAs: false
      });
    }
  });
}



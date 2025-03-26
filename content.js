// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageTitle') {
    // 如果是获取页面标题的消息，返回当前页面标题
    sendResponse({ title: document.title || 'Webpage' });
  }
  return true; // 保持消息通道开放以进行异步响应
});
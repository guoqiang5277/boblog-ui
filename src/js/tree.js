/**
 * Bo-Blog Tree Component - JavaScript
 * 树形组件交互：点击节点内容区自动展开/折叠子节点
 *
 * 行为：
 * - 点击 .boblog-tree-node-content 时，如果该节点有 .boblog-tree-children，
 *   则切换父 .boblog-tree-node 的 .expanded 类
 * - 叶子节点（无 children）点击不做展开/折叠处理
 */
(function () {
  /* 初始化树形组件交互 */
  function initTree() {
    document.addEventListener('click', function (e) {
      /* 找到被点击的 .boblog-tree-node-content */
      var content = e.target.closest('.boblog-tree-node-content');
      if (!content) return;

      var node = content.closest('.boblog-tree-node');
      if (!node) return;

      /* 只对有 children 的节点做展开/折叠 */
      var children = node.querySelector(':scope > .boblog-tree-children');
      if (!children) return;

      node.classList.toggle('expanded');
    });
  }

  /* DOM 就绪后初始化 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTree);
  } else {
    initTree();
  }
})();

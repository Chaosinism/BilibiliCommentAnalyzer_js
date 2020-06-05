# 哔哩哔哩评论统计工具 - 油猴脚本版

## 功能介绍
本脚本在哔哩哔哩视频页面的左上方添加一个按钮，对该视频的评论进行统计，可用于推测视频是否存在控评与水军行为。主要功能如下：

 - 调用旧版客户端API，推测已经被删除的楼层数量；
 - 调用chart.js绘制多个统计图表，包括时间趋势、用户等级/UID、评论字数等；
 - 导出包含所有评论楼层的JSON文件以供进一步分析。
 
注：按钮会弹出窗口，若被浏览器阻止则无法显示统计信息。

## 安装方法
首先需要为浏览器安装油猴脚本扩展：

- Chrome：[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox：[Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Safari：[Tampermonkey](http://tampermonkey.net/?browser=safari)

之后可访问[GreasyFork](https://greasyfork.org/zh-CN/scripts/404705-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E8%A7%86%E9%A2%91%E8%AF%84%E8%AE%BA%E7%BB%9F%E8%AE%A1%E5%88%86%E6%9E%90)安装此脚本。

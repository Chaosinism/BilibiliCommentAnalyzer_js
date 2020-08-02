// ==UserScript==
// @name         哔哩哔哩视频评论统计分析
// @namespace    https://github.com/chaosinism
// @version      0.2
// @description  分析视频评论区数据，在视频左上方增加按钮来查看。
// @author       Chaosinism
// @require      https://cdn.jsdelivr.net/npm/chart.js@2.8.0
// @match        *://*.bilibili.com/video*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // 增添网页按钮
    var trigger=document.createElement("input");
    trigger.type="button";
    trigger.value="下载&分析评论";
    trigger.onclick = jsonRequest;
    var buttonPosition=document.getElementById("app");
    buttonPosition.parentNode.insertBefore(trigger, buttonPosition);
    var progress=document.createElement("label");
    progress.textContent="";
    buttonPosition.parentNode.insertBefore(progress, buttonPosition);

    // 尝试请求评论JSON文件
    var title = "";
    var aid = -1;
    var apiURL = "";
    var nextCursor = 0;
    var jsonResponse = null;
    var isInitialized = true;
    var pageDownloaded = 0;
    function jsonRequest()
    {
        aid = unsafeWindow.aid;
        apiURL = "http://api.bilibili.com/x/v2/reply/main?type=1&mode=2&oid="+aid+"&next="+String(nextCursor);
        title = document.getElementsByClassName("video-title")[0].title;

        GM_xmlhttpRequest ( {
            method:         "GET",
            url:            apiURL,
            responseType:   "json",
            onload:         jsonMerge,
            onabort:        report_Error,
            onerror:        report_Error,
            ontimeout:      report_Error
        } );

    }

    function jsonMerge(rspObj)
    {
        jsonText = rspObj.responseText;
        var jsonPage = JSON.parse(jsonText);
        pageDownloaded += 1;
        progress.textContent="已读取"+String(pageDownloaded)+"页评论"

        // 判断是否达到评论区末尾
        if (jsonPage.data.replies == null){
            parseComments();
            return;
        }
        else {
            nextCursor = jsonPage.data.cursor.next;
        }

        // 合并本页评论到全部评论
        if (isInitialized == true){
            jsonResponse = JSON.parse(jsonText);
            isInitialized = false;
        }
        else {
            for (let i = 0; i < jsonPage.data.replies.length; ++i) {
                jsonResponse.data.replies.push(jsonPage.data.replies[i]);
            }
        }

        jsonRequest()
    }

    // 解析评论
    var jsonText = "";
    var allCount = -1;
    var maxFloor = -1;
    var realFloor = -1;
    var profileWordCount = [];
    var profileTime = [];
    var profileUsers = {};
    var sortedUsers = [];
    function parseComments () {
        nextCursor = 0;
        isInitialized = true;
        pageDownloaded = 0;
        progress.textContent="";

        if (jsonResponse.data.top.upper != null) {
            jsonResponse.data.replies.push(jsonResponse.data.top.upper);
        }
        allCount = jsonResponse.data.cursor.all_count;
        realFloor = jsonResponse.data.replies.length;
        maxFloor = -1;
        profileWordCount = [];
        profileTime = [];
        profileUsers = {};
        sortedUsers = [];

        for (let i = 0; i < jsonResponse.data.replies.length; ++i) {
            var reply = jsonResponse.data.replies[i];
            if (reply.floor > maxFloor) {
                maxFloor = reply.floor;
            }
            profileWordCount[i] = reply.content.message.length;
            profileTime[i] = reply.ctime;
            var mid = reply.member.mid;
            if (mid in profileUsers) {
                profileUsers[mid].count += 1;
            }
            else {
                profileUsers[mid] = {count: 1, name: reply.member.uname, level: reply.member.level_info.current_level};
            }
        }
        sortedUsers=Object.keys(profileUsers).sort(function(a,b){return profileUsers[b].count-profileUsers[a].count});

        createStatWindow();
    }

    function report_Error (rspObj) {
        alert('下载评论JSON文件失败。');
    }

    // 创建新窗口并绘图
    var statWindow = null;
    var chart = null;
    function createStatWindow() {
        if (statWindow!=null) {statWindow.close();}
        statWindow = window.open("", "统计数据", "width=800,height=1000");
        statWindow.document.write("<h1>视频评论数据统计</h1>");

        var exportButton=document.createElement("input");
        exportButton.type="button";
        exportButton.value="导出原始JSON文件";
        exportButton.onclick = exportJSON;
        statWindow.document.body.appendChild(exportButton);
        statWindow.document.write('<a id="downloadAnchorElem" style="display:none"></a>');

        statWindow.document.write("<h2>基本信息</h2>");
        statWindow.document.write("<p>视频标题："+title+"</p>");
        statWindow.document.write("<p>视频AV编号："+String(aid)+"</p>");
        statWindow.document.write("<p>总评论条数："+String(allCount)+"</p>")
        statWindow.document.write("<p>显示楼层数："+String(realFloor)+"</p>")
        statWindow.document.write("<p>实际楼层数（推定）："+String(maxFloor)+"</p>")
        statWindow.document.write("<p>被删除/举报楼层数（推定）："+String(maxFloor-realFloor)+"</p>")

        statWindow.document.write("<h2>数据图表</h2>");
        statWindow.document.write('<h3 id="dataviz-title">图表标题</h3>');
        //statWindow.document.write('<div class="chart-container" style="position: relative; height:40vh; width:80vw"><canvas id="dataviz"></canvas></div>');
        statWindow.document.write('<div class="chart-container"><canvas id="dataviz"></canvas></div>');
        statWindow.document.write('<p id="dataviz-desc">图表描述</p>');

        var PlotButton1=document.createElement("input");
        PlotButton1.type="button";
        PlotButton1.value="评论日期分布图";
        PlotButton1.onclick = plotTime;
        statWindow.document.body.appendChild(PlotButton1);

        var PlotButton2=document.createElement("input");
        PlotButton2.type="button";
        PlotButton2.value="评论用户等级分布图";
        PlotButton2.onclick = plotLevel;
        statWindow.document.body.appendChild(PlotButton2);

        var PlotButton3=document.createElement("input");
        PlotButton3.type="button";
        PlotButton3.value="评论用户UID分布图";
        PlotButton3.onclick = plotUid;
        statWindow.document.body.appendChild(PlotButton3);

        var PlotButton4=document.createElement("input");
        PlotButton4.type="button";
        PlotButton4.value="评论字数分布图";
        PlotButton4.onclick = plotWordCount;
        statWindow.document.body.appendChild(PlotButton4);

        var PlotButton5=document.createElement("input");
        PlotButton5.type="button";
        PlotButton5.value="同用户多条评论统计图";
        PlotButton5.onclick = plotFloorCount;
        statWindow.document.body.appendChild(PlotButton5);

        plotTime();
    }

    // 导出JSON
    function exportJSON() {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonResponse,null,2));
        var dlAnchorElem = statWindow.document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "av"+String(aid)+".json");
        dlAnchorElem.click();
    }

    // 绘制图表 - 用户等级分布
    function plotLevel() {
        statWindow.document.getElementById('dataviz-title').innerHTML="评论用户等级分布";
        var dataset = [0, 0, 0, 0, 0, 0];
        var aveLevel = 0.0;
        for (let user in profileUsers) {
            dataset[profileUsers[user].level-1]++;
            aveLevel+=profileUsers[user].level;
        }

        aveLevel/=Object.keys(profileUsers).length;
        statWindow.document.getElementById('dataviz-desc').innerHTML="平均等级："+String(aveLevel);

        var ctx = statWindow.document.getElementById('dataviz').getContext('2d');
        if (chart!=null) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1级', '2级', '3级', '4级', '5级', '6级'],
                datasets: [{
                    label: '评论人数',
                    backgroundColor: 'rgba(100, 160, 250, 0.75)',
                    borderColor: 'rgb(100, 160, 250)',
                    data: dataset
                }]
            },
            options: {}
        });
    }

    // 绘制图表 - UID分布
    function plotUid() {
        statWindow.document.getElementById('dataviz-title').innerHTML="评论用户UID分布";
        var maxCount = -1;
        var minCount = null;
        for (let mid in profileUsers) {
            maxCount=mid;
            if (minCount===null) {minCount=mid;}
        }
        statWindow.document.getElementById('dataviz-desc').innerHTML="最低UID用户："+profileUsers[minCount].name+" - https://space.bilibili.com/"+String(minCount);
        statWindow.document.getElementById('dataviz-desc').innerHTML+="<br>最高UID用户："+profileUsers[maxCount].name+" - https://space.bilibili.com/"+String(maxCount);

        var label = [];
        var dataset = [];
        var skip = Math.floor(Math.log10(minCount)*10);
        var scale = Math.ceil(Math.log10(maxCount)*10);
        for (let i = skip; i < scale; ++i) {
            label[i-skip]=String(Math.ceil(Math.pow(10,(i+1)*0.1)));
            dataset[i-skip]=0;
        }
        for (let mid in profileUsers) {
            var index = Math.ceil(Math.log10(mid)*10);
            dataset[index-1-skip]++;
        }
        for (let i = 1; i < scale; ++i) {
            dataset[i]+=dataset[i-1];
        }
        var ctx = statWindow.document.getElementById('dataviz').getContext('2d');
        if (chart!=null) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: label,
                datasets: [{
                    label: '评论人数',
                    backgroundColor: 'rgba(100, 160, 250, 0.75)',
                    borderColor: 'rgb(100, 160, 250)',
                    data: dataset
                }]
            },
            options: {}
        });
    }

    // 绘制图表 - 评论字数分布
    function plotWordCount() {
        statWindow.document.getElementById('dataviz-title').innerHTML="评论字数分布";
        var maxCount = -1;
        var aveCount = 0.0;
        for (let i = 0; i < profileWordCount.length; ++i) {
            aveCount+=profileWordCount[i];
            if (maxCount<profileWordCount[i]) {
                maxCount=profileWordCount[i];
            }
        }
        aveCount/=profileWordCount.length;
        statWindow.document.getElementById('dataviz-desc').innerHTML="平均评论字数："+String(aveCount);
        statWindow.document.getElementById('dataviz-desc').innerHTML+="<br>最长评论字数："+String(maxCount);

        var label = [];
        var dataset = [];
        var scale = Math.ceil(Math.log10(maxCount)*5);
        for (let i = 0; i < scale; ++i) {
            label[i]=String(Math.ceil(Math.pow(10,(i+1)*0.2)))+"字以内";
            dataset[i]=0;
        }
        for (let i = 0; i < profileWordCount.length; ++i) {
            var index = Math.ceil(Math.log10(profileWordCount[i])*5);
            if (index<1) {index=1;}
            dataset[index-1]++;
        }
        for (let i = 1; i < scale; ++i) {
            dataset[i]+=dataset[i-1];
        }
        var ctx = statWindow.document.getElementById('dataviz').getContext('2d');
        if (chart!=null) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: label,
                datasets: [{
                    label: '评论条数',
                    backgroundColor: 'rgba(100, 160, 250, 0.75)',
                    borderColor: 'rgb(100, 160, 250)',
                    data: dataset
                }]
            },
            options: {}
        });
    }

    // 绘制图表 - 同用户多条评论
    function plotFloorCount() {
        statWindow.document.getElementById('dataviz-title').innerHTML="每人评论条数分布";
        var maxCount = profileUsers[sortedUsers[0]].count
        var label = [];
        var dataset = [];
        for (let i=2; i<maxCount+1; ++i) {
            label[i-2]=String(i)+"条";
            dataset[i-2]=0;
        }
        for (let user in profileUsers) {
            dataset[profileUsers[user].count-2]++;
        }

        statWindow.document.getElementById('dataviz-desc').innerHTML="评论最多用户：";
        var highRank = Math.min(5,sortedUsers.length);
        for (let i=0;i<highRank;++i) {
            statWindow.document.getElementById('dataviz-desc').innerHTML+="<br>";
            statWindow.document.getElementById('dataviz-desc').innerHTML+=profileUsers[sortedUsers[i]].name+" - "+String(profileUsers[sortedUsers[i]].count)+"条评论 - https://space.bilibili.com/"+String(sortedUsers[i]);
        }

        var ctx = statWindow.document.getElementById('dataviz').getContext('2d');
        if (chart!=null) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: label,
                datasets: [{
                    label: '用户数',
                    backgroundColor: 'rgba(100, 160, 250, 0.75)',
                    borderColor: 'rgb(100, 160, 250)',
                    data: dataset
                }]
            },
            options: {}
        });
    }

    // 绘制图表 - 日期分布
    function plotTime() {
        statWindow.document.getElementById('dataviz-title').innerHTML="评论日期分布";
        var maxTime = profileTime[0];
        var minTime = profileTime[profileTime.length-1];
        var label = [];
        var dataset = [];

        for (let i=0;i<101;++i) {
            var date = new Date( minTime*1000 + (maxTime-minTime)*i*.01*1000);
            label[i]=date.toString();
            dataset[i] = 0;
        }

        for (let i=0;i<profileTime.length;++i) {
            var index = Math.ceil((profileTime[i]-minTime)/(maxTime-minTime)*100);
            dataset[index]++;
        }

        for (let i=1;i<101;++i) {
            dataset[i] += dataset[i-1];
        }

        statWindow.document.getElementById('dataviz-desc').innerHTML="";

        var ctx = statWindow.document.getElementById('dataviz').getContext('2d');
        if (chart!=null) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: label,
                datasets: [{
                    label: '评论条数',
                    backgroundColor: 'rgba(100, 160, 250, 0.75)',
                    borderColor: 'rgb(100, 160, 250)',
                    data: dataset
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        ticks: {
                            display: false
            }
        }]
    }
            }
        });
    }

})();

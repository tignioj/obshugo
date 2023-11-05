# Obsidian插件：hugo小助手
>你不是Doit主题，这个插件对你几乎没用

本插件定制于静态博客[hugo](https://gohugo.io/)的[Doit主题](https://github.com/HEIGE-PCloud/DoIt)。
Doit主题中，文档的结构目录挺有意思，他不是以文档名本身作为标题，而是目录，这么做的原因是文档名称用来标识不同国家语言。
因此文档标题只能写入md文件中。

## 这个插件的作用是？
当我们需要修改文档标题时，既要修改目录，又要修改文件内部的title字段，相当麻烦，因此定制了一些插件用于同步标题以及其他有用的信息。

# 功能1：一键修改文档首部的yaml信息

## 修改分类、标题和上次修改时间
文档目录结构为


    |仓库
    |content
      |posts                     <--文档路径
        |Linux                   <--分类
          |编程杂谈               <--分类
            |Ubuntu安装Samba      <--文档标题
              |index.zh-cn.md     <--中文文档
              |index.en.md        <--英文文档



当选中 index.zh-cn.md时候，执行 "更新选中文档的最新修改日期、分类和标题"时候，则自动生成如下内容
```yaml
---
lastmod: 2023-11-05T21:52:00.743Z
categories:
  - 编程杂谈
  - Linux
  - Ubuntu
title: Ubuntu安装Samba
---
```
其中
- `lastmod`: 基于文档的最后修改时间，格式化为ISO 8061标准时间
- `categories` 的值基于文档所在路径，对路径进行切割，排除掉根目录和文档所在的目录后，得到的数组。
- `title` 则是文档名称，基于父目录的名称。因为文档本身的名称需要用来标识何种语言的文档，因此md文件不能用文档标题作为名称。

# 功能2：文档也有连续剧--系列
写博客的时候，除了分类、标签以外，觉得分类还是不太够，比如一些连贯的文章仅仅是靠标签和分类是不够的，因此加入了“系列”的功能。
我不清楚他内部是怎么实现的，但是我们要用它的方法，只需要做到以下几点。
### 1. 创建系列：结构为 `series/[系列名称]/index_xx.md`




      |仓库
      |content
      | |posts                     <--文档路径
      |   |Linux                   <--分类
      |     |编程杂谈               <--分类
      |       |Ubuntu安装Samba      <--文档标题
      |         |index.zh-cn.md     <--中文文档
      |         |index.en.md        <--英文文档
      |...
        |series                     <--系列路径
          |Linux从入门到放弃         <--系列名称  
            |index.zh-cn.md     <--中文文档
            |index.en.md        <--英文文档
          |MySQL删库指南         <--系列名称  
            |index.zh-cn.md     <--中文文档
            |index.en.md        <--英文文档



注意到上面的目录结构中，我们创建了两个系列，分别是`Linux从入门到放弃`和`MySQL删库指南`,他们都必须位于series目录之下！而且只能一级目录，不能放多级目录。
其中，index.zh-cn.md和index.en.md则存放title信息，这样在不同语言环境下就能显示出对应的语言。


    |Linux从入门到放弃         <--系列名称  
      |index.zh-cn.md     <--中文文档
      |index.en.md        <--英文文档

其中index.zh-cn.md内容如下
```yaml
---
title: Linux从入门到放弃
---
```

其中index.en.md内容如下
```yaml
---
title: I love Linux
---
```

当我们需要将某篇文章加入到系列，不需要在系列目录下创建新的文档，只需要在我们posts/下面写好的文档中，属性加入 `series: [系列名称]` 即可。

```yaml
---
lastmod: 2023-11-05T21:52:00.743Z
categories:
  - 编程杂谈
  - Linux
  - Ubuntu
title: Ubuntu安装Samba
series:
  - Linux从入门到放弃
---
```

这时候同样的问题来了，每次我们创建系列的时候，还要手动复制粘贴，太麻烦，不如弄个按钮点击后，自动遍历 series/下的所有名称，然后呈现一个带搜索框的列表，点击后就直接插入到我们的文档中，岂不美哉？


# 如何使用？
## 安装插件
1. 新建一个用于存放我们插件的文件夹，名字就叫 myobsplugins

```shell
mkdir -p .obsidian/plugins/myobsplugins/
``````

2. 复制 `main.ts`, `main.js`和`style.css`以及`manifest.json`四个文件到刚刚创建的目录下


        |仓库
        |.obsidian
          |plugins
            |myobsplugins
              |main.ts
              |main.js
              |manifest.json
              |style.css



3. 打开obsidian，在第三方插件中开启 `myobsplugins`
选中文档，按下左边的按钮就可以了。
注意，在obsidian中，文档信息必须放在第一行，否则不识别！


# 如何Debug？

下载本仓库到obsidian插件目录，进入插件目录执行 `nmp -i` 安装依赖，接着执行`npm run dev`,打开obsidian开启插件，就可以进入调试了。

> 提示，Windows用户按下`Ctrl + Shift + I`可以打开obsidian的控制台

更多信息可以查看[这篇文章](https://blog.codee.top/obsidian%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91%E4%B8%80%E5%85%A5%E9%97%A8/)

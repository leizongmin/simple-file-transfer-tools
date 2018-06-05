# @leizm/sftt

简单文件传输工具

## 安装

```bash
npm i -g @leizm/sftt
```

## 启动服务器端

使用方法：

```bash
sftt-server --help

  Usage: sftt-server [options]

  Options:

    -V, --version      output the version number
    -i, --ip <ip>      允许的来源IP地址 (default: 127.0.0.1)
    -p, --port <port>  监听的端口 (default: 12345)
    -h, --host <host>  监听的地址 (default: 0.0.0.0)
    -d, --dir <dir>    文件根目录 (default: .)
    -h, --help         output usage information
```

示例：

```bash
sftt-server --ip 192.168.1.2,127.0.0.1 --port 12345 --host 0.0.0.0 --dir /data
```

## 客户端上传文件

使用方法：

```bash
sftt-client --help

  Usage: sftt-client [options]

  Options:

    -V, --version          output the version number
    -f, --file <file>      要上传的文件 (default: )
    -d, --dir <dir>        要上传的目录 (default: )
    -s, --server <server>  远程服务器地址（host:port/path） (default: 127.0.0.1:12345/data)
    -h, --help             output usage information
```

示例：

```bash
# 上传文件
sftt-client --server 127.0.0.1:12345/dir1 --file test.txt
# 上传整个目录下的所有文件
sftt-client --server 127.0.0.1:12345/dir2 --dir data
```

## 通过 PM2 启动服务器端

新建配置文件 `sftt-server.pm2.yaml`：

```yaml
apps:
  - name: sftt-server
    script: /usr/local/bin/sftt-server
    instances: 1
    exec_mode: fork
    args:
      - "--ip"
      - "127.0.0.1"
      - "--port"
      - "12345"
      - "--host"
      - "0.0.0.0"
      - "--dir"
      - "/data"
```

说明：

* `script` 中的 `/usr/local/bin/sftt-server` 是 `sftt-server` 命令的绝对文件路径，可以通过执行 `which sftt-server` 获得
* `args` 部分为相应的命令行参数

然后，执行以下命令即可通过 PM2 启动：

```bash
pm2 start sftt-server.pm2.yaml
```

## License

```text
MIT License

Copyright (c) 2018 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

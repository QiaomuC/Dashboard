Vue.use(VueApexCharts)
Vue.component('apexchart', VueApexCharts)
var app = new Vue({
    el: '#app',
    data: function () {
        let data = JSON.parse(localStorage.getItem("DATA") || JSON.stringify({}));

      return {
        farm: data.farm,
        plot: data.plot,

        diskMap: data.diskMap,
        errors: data.errors,
        events: data.events,

        calculator: null,
        calcLoading: true,
        nPlot: null,
        slider: 0, 
        sliderValue: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,55,64,80,105,141,190,254,335,435,536,637,738,839,940,1041,1142,1243,1344,1445,1596,1747,1898,2049,2200,2351,2502,2653,2804,2955,3226,3497,3768,4039,4310,4581,4852,5123,5394,5665,6098,6531,6964,7397,7830,8263,8696,9129,9562,10000],
        setSliderFlag: false, 

        intervals: [],
        
        activePage: 0,
      }
    },
    mounted: function () {
        this.load();
    },
    methods: {
        getInfo(path) {

            let url = `http://10.177.0.165:5000/server/${path}`;
            let username = 'test';
            let password = 'test';

            let headers = new Headers();

            headers.append('Content-Type', 'text/json');
            headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));

            return fetch(url, {
                method: 'GET',
                headers: headers,
            });
        },
        load() {
            this.getInfo('plotter')
                .then(response => response.json())
                .then(json => {
                    this.plot = json;
                    this.sortDisks(this.plot);
                    this.plot.jobs.forEach(_ => _.progress = this.calcProgress(_.phase))
                    this.calcCpuMap(this.plot);
                    this.calcFarmPlotMap();
                });
            this.getInfo('farmer')
                .then(response => response.json())
                .then(json => {
                    this.farm = json;
                    this.sortDisks(this.farm);
                    this.calcCpuMap(this.farm);
                    this.calcFarmPlotMap();
                    this.calculate(); 
                });
        },
        save() {
            localStorage.setItem("DATA", JSON.stringify({
                farm: this.farm,
                plot: this.plot,
                diskMap: this.diskMap,
                errors: this.errors,
                events: this.events,
            }));
        },
        switchPage(pageNumber) {
            this.activePage = pageNumber;
            if(this.activePage == 2) {
                this.stopRefresh();
            } else { 
                this.autoRefresh(); 
            }; 
        },
        autoRefresh() {
            var temp; 
            temp = setInterval(() => {
                this.getInfo('servers')
                    .then(response => response.json())
                    .then(json => {
                        var f = json.find(_ => _.name == 'Farmer');
                        var p = json.find(_ => _.name == 'Plotter');
                        this.sortDisks(f);
                        this.sortDisks(p);
                        Object.assign(this.farm, f);
                        Object.assign(this.plot, p);
                        this.calcCpuMap(this.farm);
                        this.calcCpuMap(this.plot);
                    });
                this.getInfo('errors')
                    .then(response => response.json())
                    .then(json => {
                        this.errors = json;
                    });
                this.getInfo('events')
                    .then(response => response.json())
                    .then(json => {
                        this.events = json;
                    });
            }, 5000);
            this.intervals.push(temp); 
            temp = setInterval(() => {
                this.save();
            }, 5000);
            this.intervals.push(temp); 
            temp = setInterval(() => {
                this.load();
            }, 20000);
            this.intervals.push(temp); 
        },
        stopRefresh() {
            for(var i = 0; i < this.intervals.length; i++) {
                clearInterval(this.intervals[i]); 
            };
        },
        sortDisks(machine) {
            if (machine.disks) machine.disks.sort((a, b) => a.path.localeCompare(b.path));
        },
        calcProgress(phase) {
            const p = Number(phase[0]);
            const n = Number(phase[2]);
            if (p == 1) return n * 5;
            if (p == 2) return 35 + n * 3;
            if (p == 3) return 56 + n * 5;
            if (p == 4) return 98;
        },
        calcCpuMap(machine) {
            machine.cpuMap = {
                data: [{
                    name: 'Cpu',
                    data: machine.cpus.map(_ => 100 - _),
                }],
                chartOptions: {
                    chart: {
                        type: 'bar',
                        height: 150
                    },
                    plotOptions: {
                        bar: {
                            horizontal: false,
                            colors: {
                                ranges: [{
                                    from: 0,
                                    to: 100,
                                    color: "#FF0000"
                                }]
                            },
                            columnWidth: '55%',
                            endingShape: 'rounded'
                        },
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        show: true,
                        width: 2,
                        colors: ['transparent']
                    },
                    xaxis: {
                        categories: machine.cpus.map((_, i) => i + 1),
                    },
                    yaxis: {
                        title: {
                            text: 'CPU Usage'
                        },
                        max: 100,
                        min: 0,
                        decimalsInFloat: 0,
                    },
                    fill: {
                        opacity: 1
                    },
                    tooltip: {
                        y: {
                            formatter: function (val) {
                                return val + " %"
                            }
                        }
                    }
                }
            };
        },
        calcFarmPlotMap() {
            if (!this.farm || !this.plot) return;
            const pn = this.farm.farm.plotCount;
            const tt = 12 + 40;
            const plots = this.plot.jobs.map(_ => Number(_.phase[0])).sort((a, b) => b - a);
            const series = new Array(10).fill().map((_, rowi) => ({
                name: rowi + 1,
                data: new Array(tt).fill().map((_, coli) => {
                    const idx = coli * 10 + rowi;
                    if (idx < pn) return 6;
                    if (idx - pn >= plots.length) return 0;
                    const curplot = plots[idx - pn];
                    return curplot;
                })
            }));


            this.diskMap = {
                series,
                chartOptions: {
                    chart: {
                        height: 350,
                        type: 'heatmap',
                    },
                    plotOptions: {
                        heatmap: {
                            shadeIntensity: 0.5,
                            radius: 0,
                            // useFillColorAsStroke: true,
                            colorScale: {
                                ranges: [{
                                        from: 0,
                                        to: 0,
                                        name: 'Empty',
                                        color: '#DDDDDD'
                                    },
                                    {
                                        from: 1,
                                        to: 1,
                                        name: 'Phase 1',
                                        color: '#FF0000'
                                    },
                                    {
                                        from: 2,
                                        to: 2,
                                        name: 'Phase 2',
                                        color: '#0000FF'
                                    },
                                    {
                                        from: 3,
                                        to: 3,
                                        name: 'Phase 3',
                                        color: '#FFB200'
                                    },
                                    {
                                        from: 4,
                                        to: 4,
                                        name: 'Phase 4',
                                        color: '#006600'
                                    },
                                    {
                                        from: 5,
                                        to: 5,
                                        name: 'Moving',
                                        color: '#128FD9'
                                    },
                                    {
                                        from: 6,
                                        to: 6,
                                        name: 'Harvesting',
                                        color: '#00A100'
                                    },
                                ]
                            }
                        }
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        width: 1
                    },
                    title: {
                        text: '磁盘工作情况'
                    },
                },
            };
        },
        humanize(size) {
            var i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
        },
        getDiskProgressType(used, size) {
            const perc = used / size;
            if (perc < 0.5) return 'success';
            if (perc < 0.7) return 'warning';
            return 'danger';
        },
        setSlider() {
            this.setSliderFlag = true; 
            var nPlot = parseInt(this.nPlot); 
            if(nPlot >= 10000) {
                this.slider = 99; 
            } else {
                for(var i = 0; i < 99; i++) { 
                    if(nPlot >= this.sliderValue[i] && nPlot < this.sliderValue[i+1]) {
                        this.slider = i; 
                    };
                };
            };
            this.calculate(); 
        },
        setNPlot() {
            if(!this.setSliderFlag) {
                this.nPlot = this.sliderValue[this.slider]; 
                this.calculate(); 
            } else {
                this.setSliderFlag = false; 
            }
        },
        calculate() {
            this.calcLoading = false;
            const unitPlotSize = 101.4; 
            var nPlot = (this.nPlot==""||this.nPlot<0)? 1:parseInt(this.nPlot); 
            var rawTotalNetSpace = parseFloat(this.farm.node.space); //EiB
            var totalNetSpace = 0; 
            totalNetSpace = rawTotalNetSpace*1024; 
            var ownedNetSpace = (nPlot*unitPlotSize)/(rawTotalNetSpace*Math.pow(1024,3))*100; 
            var proportion = (nPlot*unitPlotSize)/(rawTotalNetSpace*Math.pow(1024,3));
            var averageBlockTime = 18.75; // in seconds (last paragraph in https://docs.google.com/document/d/1tmRIb7lgi4QfKkNaxuKOBHRmwbVlGL4f7EsBDr_5xZE/edit#heading=h.z0v0b3hmk4fl)
            var expectTimeWin = ((averageBlockTime/60)/proportion); // in minutes (reference:https://github.com/Chia-Network/chia-blockchain/blob/95d6030876fb19f6836c6c6eeb41273cf7c30d93/chia/cmds/farm_funcs.py#L246-L247)

            // Advanced info 
            if(!this.calculator) this.calculator = {
                timeFrame: 6,
                startDate: new Date(),
                plottingSpeed: 0.0,
                maxSize: 1014.0,
                unlimited: true,
                initNetSize: parseFloat(rawTotalNetSpace), // EiB 
                growthRate: 15, 
                unbounded: false,
                exponentialGrowth: 30, 
                stabilization: 150,
                stableDaily: 5.000,
                timeFrameUnit: "month",
                initSizeUnit: "gib",
                plottingSpeedUnit: "gib",
                maxSizeUnit: "gib",
                initNetSizeUnit: "eib",
                growthRatePeriod: "weekly",
                stableDailyUnit: "pib",

            };
            this.calculator.totalNetSpace = totalNetSpace.toFixed(2);
            this.calculator.ownedNetSpace = ownedNetSpace.toFixed(5);
            this.calculator.initSize = 101.4*nPlot;

            function formatTime(time) {
                var day; 
                day = time/(24*60); 
                if(day < 1) {
                    var hour, min; 
                    hour = Math.floor(time/60); 
                    if(hour < 1) {
                        if(time < 1) return "Less than 1 minute";
                        else return "About "+time.toFixed(0).toString()+" minutes";
                    } else {
                        min = Math.floor(time-hour*60);
                        if(min < 1) return hour.toString()+" hours";
                        else return hour.toString()+" hours "+min.toString()+" minutes";
                    };
                } else if(day < 31) {
                    return day.toFixed(0).toString()+" days";
                } else {
                    var month, temp_day; 
                    month = Math.floor(day/30); 
                    temp_day = Math.floor(day-month*30); 
                    if(month < 12) {
                        return month.toString()+" months "+temp_day.toString()+" days";
                    } else {
                        var year; 
                        year = Math.floor(day/365);
                        if(year < 1) return "Almost 1 year"
                        else {
                            var temp_month = Math.floor((day-year*365)/30); 
                            if(temp_month < 1) return year.toString()+" years";
                            else {
                                return year.toString()+" years "+temp_month.toString()+" months";
                            }
                        }
                    }
                }
            }; 
            this.calculator.expectTimeWin = (nPlot==0)? "Never":formatTime(expectTimeWin);
            if(this.calculator.maxSize < this.calculator.initSize) this.calculator.maxSize = this.calculator.initSize;

            var netSpaceData = []; 
            var plotSizeData = []; 
            var ownedSpaceData = []; 
            var dailyEarningData = []; 
            var totalEarningData = []; 
            var timeFrameCategory = []; 
            
            function get_days(startDate, n, unit) {
                var date1 = new Date(startDate); 
                var date2 = new Date(startDate); 
                if(unit == "year") {
                    date2.setFullYear(parseInt(date1.getFullYear())+n); 
                } else if(unit == "month") {
                    date2.setMonth(parseInt(date1.getMonth())+n); 
                };
                var timeDif = date2.getTime() - date1.getTime(); 
                return (timeDif/(1000 * 3600 * 24)).toFixed(0); 
            };

            var i; 
            var nDays = get_days(this.calculator.startDate, parseInt(this.calculator.timeFrame), this.calculator.timeFrameUnit);
            for(i = 0; i < nDays; i++) {
                var date = new Date();
                timeFrameCategory.push(date.setDate(new Date(this.calculator.startDate).getDate()+i)); 
            };

            // graph of network space 
            // TODO
            var prevDayNetSpace = parseFloat(this.calculator.initNetSize); 
            for(i = 0; i < nDays; i++) {
                if (this.calculator.unbounded) {
                    if(i) {
                        prevDayNetSpace = prevDayNetSpace*(1+parseFloat(this.calculator.growthRate)/100/7);
                    } 
                } else {
                    if (i < parseInt(this.calculator.exponentialGrowth)) {
                        prevDayNetSpace = prevDayNetSpace*(1+parseFloat(this.calculator.growthRate)/100/7); 
                    } else if (i < parseInt(this.calculator.exponentialGrowth) + parseInt(this.calculator.stabilization)) {
                        prevDayNetSpace = prevDayNetSpace + parseFloat(this.calculator.stableDaily)/1024; 
                    } 
                };
                netSpaceData.push([timeFrameCategory[i], prevDayNetSpace.toFixed(3)]);
            };

            // graph of size of plots 
            var newSize = parseFloat(this.calculator.initSize)
            for(i = 0; i < nDays; i++) {
                if(!this.calculator.unlimited) {
                    if(newSize+parseFloat(this.calculator.plottingSpeed) <= parseFloat(this.calculator.maxSize)) {
                        newSize = newSize + parseFloat(this.calculator.plottingSpeed); 
                    }
                } else {
                    newSize = newSize + parseFloat(this.calculator.plottingSpeed); 
                }
                plotSizeData.push([timeFrameCategory[i], newSize.toFixed(3)])
            }

            // graph of owned space 
            for(i = 0; i < nDays; i++) {
                var newOwnedSpace = plotSizeData[i][1]/(netSpaceData[i][1]*Math.pow(1024,3)) *100; // percentage 
                ownedSpaceData.push([timeFrameCategory[i], newOwnedSpace]); 
            }

            // graph of daily earnings 
            // TODO 
            for(i = 0; i < nDays; i++) {
                var dailyProportion = plotSizeData[i][1]/(netSpaceData[i][1]*Math.pow(1024,3)); 
                var dailyEarning = 2*(1-Math.pow((1-dailyProportion),4608)); // reference: https://thechiafarmer.com/2021/04/23/estimated-time-to-win-explained/
                dailyEarningData.push([timeFrameCategory[i], dailyEarning]);
            }

            // graph of total earnings
            var tempSum = 0;  
            for(i = 0; i < nDays; i++) {
                tempSum = tempSum+dailyEarningData[i][1];
                totalEarningData.push([timeFrameCategory[i], tempSum]);
            }
            this.calculator.totalXCH = totalEarningData[nDays-1][1];
            this.calculator.XCHprice = 500; // TODO: get real time chia price

            this.calculator.calculatorMap = {
                series: [
                    {
                        name: "Network Space", 
                        data: netSpaceData,
                    }, 
                    {
                        name: "Size of Plots", 
                        data: plotSizeData,
                    }, 
                    {
                        name: "Owned Space", 
                        data: ownedSpaceData, 
                    },
                    {
                        name: "Daily Earning", 
                        data: dailyEarningData, 
                    },
                    {
                        name: "Total Earning", 
                        data: totalEarningData, 
                    }
                ],
                chartOptions: {
                    chart:{
                        type: "line", 
                        height: 400, 
                    }, 
                    dataLabels: {
                        enabled: false, 
                    }, 
                    stroke: {
                        curve: 'smooth',
                    }, 
                    xaxis: {
                        type: 'datetime',
                    }, 
                    yaxis: [
                        {
                            seriesName: "Network Space", 
                            show: false, 
                            decimalsInFloat: 3,
                        },
                        {
                            seriesName: "Size of Plots", 
                            show: false, 
                            decimalsInFloat: 3, 
                        }, 
                        {
                            seriesName: "Owned Space", 
                            show: false, 
                            decimalsInFloat: 5, 
                        },
                        {
                            seriesName: "Daily Earning", 
                            show: false, 
                            decimalsInFloat: 5, 
                        },
                        {
                            seriesName: "Total Earning",
                            show: false, 
                            decimalsInFloat: 5, 
                        }
                    ], 
                    tooltip: {
                        y: [{
                            title: {
                                formatter: function (val) {return val + " (EiB)"}
                            },
                        },
                        {
                            title: {
                                formatter: function (val) {return val + " (GiB)"}
                            },
                        },
                        {
                            title: {
                                formatter: function (val) {return val + " (%)"}
                            },
                        },
                        {
                            title: {
                                formatter: function (val) {return val + " (XCH)"}
                            },
                        },
                        {
                            title: {
                                formatter: function (val) {return val + " (XCH)"}
                            },
                        }]
                    }
                }
            }
        }
    },
    computed: {},
})
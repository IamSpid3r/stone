const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks").esClient;

var options = process.argv;
for(var i=0;i<options.length;i++)
{
    if(options[i].indexOf("-mapping")==0)
    {
        stoneTaskES.mapping(function (err, res) {
            if (err) {
                console.log(err.message)
            }else {
                console.log(res)
            }

        });
    }
}
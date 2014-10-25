var types = require("./types");

function ConstraintGraph() {
  this.nodes = [ ];
  this.edges = [ ];
  this.visited = [ ];
  this.size = 0;

  this.findNode = function(kind) {
    for(var i = 0; i < this.nodes.length; i++) {
      if(types.equal(kind, this.nodes[i].kind))
        return i;
    }
    return -1;
  }

  this.addNode = function(kind) {
    this.nodes.push({ kind: kind, resultKind: false }); 
    this.edges.push([ ]);
    this.size++;
  }

  this.addConstraint = function(kind1, kind2) {
    var kind1id = this.findNode(kind1);
    var kind2id = this.findNode(kind2);

    if(kind1id == -1) {
      this.addNode(kind1);
      kind1id = this.size - 1;
    }

    if(kind2id == -1) {
      this.addNode(kind2);
      kind2id = this.size - 1;
    }

    this.edges[kind1id].push(kind2id);
    this.edges[kind2id].push(kind1id);
  }

  this.dumpAll = function() {
    console.log('Nodes:', JSON.stringify(this.nodes, null, 2));
    console.log('Edges:', this.edges);
  }

  this.evaluateType = function(kind) {
    var self = this;
    var kindId = this.findNode(kind);

    if(kindId == -1)
      return types.Any;

    if(this.nodes[kindId].resultKind)
      return this.nodes[kindId].resultKind;

    while(this.visited.length < this.size)
      this.visited.push(false);

    var kinds = [];

    (function DFS(nodeId) {
      kinds.push([self.nodes[nodeId].kind, nodeId]);
      self.visited[nodeId] = true;
      self.edges[nodeId].forEach(function(edge) {
        if(!self.visited[edge])
          DFS(edge);
      });
    })(kindId);   

    var appliedKind = kinds[0][0];
    for(var i = 0; i < kinds.length; i++) {
      var kind = kinds[i][0];
      if(kind instanceof types.Generic && kind.name < appliedKind.name) {
        appliedKind = kind;
      } else if(types.equal(kind, types.Any) &&
          !(appliedKind instanceof types.Simple) &&
          !(appliedKind instanceof types.Fn)) {
        appliedKind = kind;
      } else if(kind instanceof types.Simple) {
        if(appliedKind instanceof types.Fn ||
            (appliedKind instanceof types.Simple &&
              !(types.equal(kind, appliedKind))))
          return 'OMG ERROR';
        else
          appliedKind = kind;
      } else if(kind instanceof types.Fn) {
        if(appliedKind instanceof types.Simple ||
            (appliedKind instanceof types.Fn &&
              !(types.equal(kind, appliedKind))))
          return 'OMG ERROR';
        else
          appliedKind = kind;
      } 

    }

    for(var i = 0; i < kinds.length; i++) {
      if(types.equal(this.nodes[kinds[i][1]].kind, types.Any))
        this.visited[kinds[i][1]] = false;
      else
        this.nodes[kinds[i][1]].resultKind = appliedKind;
    }

    return appliedKind;
  }
}

exports.solver = ConstraintGraph;

/*
var graph = new exports.solver();
graph.addConstraint(types.Generic('C'), types.Generic('A'));
graph.addConstraint(types.Generic('A'), types.Fn(types.Number, [types.Number], types.Number));
graph.addConstraint(types.Generic('C'), types.Fn(types.Number, [types.Number], types.String));
graph.addConstraint(types.Generic('E'), types.Generic('D'));
console.log(graph.evaluateType(types.Generic('A')));
console.log(graph.evaluateType(types.Generic('E')));
graph.dumpAll();
*/

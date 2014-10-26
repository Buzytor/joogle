var types = require("./types");
var infer = require("./infer");

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

  this.addSimpleConstraint = function(kind1, kind2) {
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
      return kind;

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
          !(appliedKind instanceof types.Fn) &&
          !(appliedKind instanceof types.Obj)) {
        //appliedKind = kind;
      } else if(kind instanceof types.Simple) {
        if(appliedKind instanceof types.Fn ||
            appliedKind instanceof types.Obj ||
            (appliedKind instanceof types.Simple &&
              !(types.equal(kind, appliedKind))))
          return 'OMG ERROR';
        else
          appliedKind = kind;
      } else if(kind instanceof types.Fn) {
        if(appliedKind instanceof types.Simple ||
            appliedKind instanceof types.Obj ||
            (appliedKind instanceof types.Fn &&
              !(types.equal(kind, appliedKind))))
          return 'OMG ERROR';
        else
          appliedKind = kind;
      } else if(kind instanceof types.Obj) {
        if(appliedKind instanceof types.Simple ||
            appliedKind instanceof types.Fn ||
            (appliedKind instanceof types.Obj &&
              (kind.mergedWith(appliedKind) == 'failed')))
          return 'OMG ERROR';
        else
          appliedKind = kind.mergedWith(appliedKind);
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

  this.addConstraint = function(constraint) {
    var a = constraint.a;
    var b = constraint.b;
    if(a instanceof types.Generic || b instanceof types.Generic)
      this.addSimpleConstraint(a, b);
    else if(a instanceof types.Fn && b instanceof types.Fn &&
        a.params.length == b.params.length) {
      this.addSimpleConstraint(a.selfType, b.selfType);
      this.addSimpleConstraint(a.returnType, b.returnType);
      for(var i = 0; i < a.params.length; i++)
        this.addSimpleConstraint(a.params[i], b.params[i]);
    } else if(a instanceof types.Obj && b instanceof types.Obj && a.mergedWith(b) != 'failed') {
      this.addSimpleConstraint(a, b);
    } else if(!(types.equal(a, b))) {
      console.log('Error matching constraint', a, b);
    }
  };
}

exports.solver = ConstraintGraph;

/*
var constraint1 = infer.Constraint(types.Obj({'test1': types.Any}), types.Obj({'test2': types.Number}));

var graph = new exports.solver();
graph.addConstraint(constraint1);
graph.dumpAll();
console.log(graph.evaluateType(types.Obj({'test1': types.Any})));
*/
/*
graph.addConstraint(types.Generic('A'), types.Fn(types.Number, [types.Number], types.Number));
*/
//console.log(JSON.stringify(types.Fn(types.Any, [types.Number], types.String), null, 2));
/*
graph.addConstraint(types.Generic('E'), types.Generic('D'));
console.log(graph.evaluateType(types.Generic('A')));
console.log(graph.evaluateType(types.Generic('E')));
graph.dumpAll();
*/

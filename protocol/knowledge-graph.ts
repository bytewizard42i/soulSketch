/**
 * SoulSketch Knowledge Graph
 * Maps relationships between memories, identities, and concepts
 * Inspired by Cipher's relationship tracking
 */

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SoulMemory } from './memory-engine.js';

export interface GraphNode {
  id: string;
  type: 'memory' | 'identity' | 'concept' | 'entity' | 'pattern';
  label: string;
  properties: Map<string, any>;
  embedding?: number[];
  weight: number;
  lastAccessed: Date;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'resonates' | 'contradicts' | 'reinforces' | 'evolves' | 'references';
  weight: number;
  properties: Map<string, any>;
  bidirectional: boolean;
}

export interface GraphCluster {
  id: string;
  nodes: Set<string>;
  centroid?: number[];
  coherence: number; // How tightly connected the cluster is
  theme?: string;
}

export interface GraphQuery {
  startNode?: string;
  nodeType?: GraphNode['type'];
  edgeType?: GraphEdge['type'];
  maxDepth?: number;
  minWeight?: number;
  includeOrphans?: boolean;
}

export class KnowledgeGraph extends EventEmitter {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private clusters: Map<string, GraphCluster> = new Map();
  private graphPath: string;

  constructor(basePath: string = '~/.soulsketch/graph') {
    super();
    this.graphPath = path.resolve(basePath.replace('~', process.env.HOME || ''));
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await fs.ensureDir(this.graphPath);
    await this.loadGraph();
  }

  private async loadGraph(): Promise<void> {
    const nodesFile = path.join(this.graphPath, 'nodes.json');
    const edgesFile = path.join(this.graphPath, 'edges.json');
    const clustersFile = path.join(this.graphPath, 'clusters.json');

    if (await fs.pathExists(nodesFile)) {
      const nodesData = await fs.readJson(nodesFile);
      this.nodes = new Map(nodesData.map((n: any) => [n.id, this.deserializeNode(n)]));
    }

    if (await fs.pathExists(edgesFile)) {
      const edgesData = await fs.readJson(edgesFile);
      this.edges = new Map(edgesData.map((e: any) => [e.id, this.deserializeEdge(e)]));
      this.rebuildAdjacencyList();
    }

    if (await fs.pathExists(clustersFile)) {
      const clustersData = await fs.readJson(clustersFile);
      this.clusters = new Map(clustersData.map((c: any) => [c.id, this.deserializeCluster(c)]));
    }
  }

  /**
   * Add a node to the graph
   */
  addNode(node: Partial<GraphNode>): GraphNode {
    const fullNode: GraphNode = {
      id: node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: node.type || 'concept',
      label: node.label || '',
      properties: node.properties || new Map(),
      embedding: node.embedding,
      weight: node.weight || 1.0,
      lastAccessed: new Date()
    };

    this.nodes.set(fullNode.id, fullNode);
    this.adjacencyList.set(fullNode.id, new Set());
    
    this.emit('node:added', fullNode);
    return fullNode;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(edge: Partial<GraphEdge>): GraphEdge {
    if (!edge.source || !edge.target) {
      throw new Error('Edge must have source and target');
    }

    // Ensure nodes exist
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error('Source or target node does not exist');
    }

    const fullEdge: GraphEdge = {
      id: edge.id || `edge_${edge.source}_${edge.target}_${Date.now()}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'references',
      weight: edge.weight || 1.0,
      properties: edge.properties || new Map(),
      bidirectional: edge.bidirectional ?? false
    };

    this.edges.set(fullEdge.id, fullEdge);
    
    // Update adjacency list
    this.adjacencyList.get(fullEdge.source)?.add(fullEdge.target);
    if (fullEdge.bidirectional) {
      this.adjacencyList.get(fullEdge.target)?.add(fullEdge.source);
    }

    this.emit('edge:added', fullEdge);
    return fullEdge;
  }

  /**
   * Add a memory as a node with automatic relationship detection
   */
  async addMemoryNode(memory: SoulMemory): Promise<GraphNode> {
    const node = this.addNode({
      id: `memory_${memory.id}`,
      type: 'memory',
      label: memory.content.substring(0, 100),
      properties: new Map([
        ['memoryType', memory.type],
        ['timestamp', memory.timestamp],
        ['resonanceScore', memory.resonanceScore]
      ]),
      embedding: memory.embedding,
      weight: memory.resonanceScore || 1.0
    });

    // Automatically create edges to harmonic memories
    if (memory.harmonics) {
      for (const harmonicId of memory.harmonics) {
        const harmonicNodeId = `memory_${harmonicId}`;
        if (this.nodes.has(harmonicNodeId)) {
          this.addEdge({
            source: node.id,
            target: harmonicNodeId,
            type: 'resonates',
            weight: 0.8,
            bidirectional: true
          });
        }
      }
    }

    // Detect and link related concepts
    await this.detectConcepts(node, memory.content);

    return node;
  }

  /**
   * Detect concepts in content and create relationships
   */
  private async detectConcepts(node: GraphNode, content: string): Promise<void> {
    // Simple concept extraction (in production, use NLP)
    const concepts = this.extractConcepts(content);
    
    for (const concept of concepts) {
      let conceptNode = this.findNodeByLabel(concept, 'concept');
      
      if (!conceptNode) {
        conceptNode = this.addNode({
          type: 'concept',
          label: concept,
          weight: 1.0
        });
      }

      this.addEdge({
        source: node.id,
        target: conceptNode.id,
        type: 'references',
        weight: 0.6
      });
    }
  }

  /**
   * Simple concept extraction (placeholder for NLP)
   */
  private extractConcepts(content: string): string[] {
    // Extract potential concepts (capitalized words, technical terms)
    const words = content.split(/\s+/);
    const concepts: Set<string> = new Set();
    
    for (const word of words) {
      // Capitalized words that aren't sentence starters
      if (word.length > 3 && /^[A-Z]/.test(word)) {
        concepts.add(word.replace(/[^\w]/g, ''));
      }
    }
    
    return Array.from(concepts).slice(0, 5); // Limit to top 5
  }

  /**
   * Find a node by label and type
   */
  private findNodeByLabel(label: string, type?: GraphNode['type']): GraphNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.label === label && (!type || node.type === type)) {
        return node;
      }
    }
    return undefined;
  }

  /**
   * Traverse the graph from a starting node
   */
  traverse(query: GraphQuery): GraphNode[] {
    const visited = new Set<string>();
    const result: GraphNode[] = [];
    
    if (query.startNode) {
      this.dfs(query.startNode, visited, result, query, 0);
    } else {
      // Return all nodes matching criteria
      for (const node of this.nodes.values()) {
        if (this.matchesQuery(node, query)) {
          result.push(node);
        }
      }
    }

    return result;
  }

  /**
   * Depth-first search traversal
   */
  private dfs(
    nodeId: string,
    visited: Set<string>,
    result: GraphNode[],
    query: GraphQuery,
    depth: number
  ): void {
    if (visited.has(nodeId)) return;
    if (query.maxDepth !== undefined && depth > query.maxDepth) return;
    
    visited.add(nodeId);
    const node = this.nodes.get(nodeId);
    
    if (node && this.matchesQuery(node, query)) {
      result.push(node);
      node.lastAccessed = new Date();
    }

    const neighbors = this.adjacencyList.get(nodeId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        const edge = this.findEdge(nodeId, neighborId);
        if (edge && (!query.edgeType || edge.type === query.edgeType)) {
          if (!query.minWeight || edge.weight >= query.minWeight) {
            this.dfs(neighborId, visited, result, query, depth + 1);
          }
        }
      }
    }
  }

  /**
   * Check if a node matches query criteria
   */
  private matchesQuery(node: GraphNode, query: GraphQuery): boolean {
    if (query.nodeType && node.type !== query.nodeType) return false;
    if (query.minWeight && node.weight < query.minWeight) return false;
    return true;
  }

  /**
   * Find an edge between two nodes
   */
  private findEdge(source: string, target: string): GraphEdge | undefined {
    for (const edge of this.edges.values()) {
      if (edge.source === source && edge.target === target) return edge;
      if (edge.bidirectional && edge.source === target && edge.target === source) return edge;
    }
    return undefined;
  }

  /**
   * Detect clusters of related nodes
   */
  async detectClusters(minSize: number = 3, minCoherence: number = 0.5): Promise<GraphCluster[]> {
    const clusters: GraphCluster[] = [];
    const visited = new Set<string>();
    
    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) continue;
      
      const cluster = this.findCluster(nodeId, visited, minCoherence);
      if (cluster.nodes.size >= minSize) {
        cluster.coherence = this.calculateCoherence(cluster);
        if (cluster.coherence >= minCoherence) {
          clusters.push(cluster);
          this.clusters.set(cluster.id, cluster);
        }
      }
    }

    this.emit('clusters:detected', clusters);
    return clusters;
  }

  /**
   * Find a cluster starting from a node
   */
  private findCluster(startId: string, visited: Set<string>, minWeight: number): GraphCluster {
    const cluster: GraphCluster = {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes: new Set(),
      coherence: 0
    };

    const queue = [startId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      cluster.nodes.add(nodeId);
      
      const neighbors = this.adjacencyList.get(nodeId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          const edge = this.findEdge(nodeId, neighborId);
          if (edge && edge.weight >= minWeight && !visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
    }

    return cluster;
  }

  /**
   * Calculate cluster coherence (how tightly connected it is)
   */
  private calculateCoherence(cluster: GraphCluster): number {
    const nodes = Array.from(cluster.nodes);
    if (nodes.length < 2) return 1.0;
    
    let totalEdges = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const edge = this.findEdge(nodes[i], nodes[j]);
        if (edge) {
          totalEdges++;
          totalWeight += edge.weight;
        }
      }
    }
    
    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    const density = totalEdges / maxPossibleEdges;
    const avgWeight = totalEdges > 0 ? totalWeight / totalEdges : 0;
    
    return (density + avgWeight) / 2;
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(sourceId: string, targetId: string): GraphNode[] | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string, path: string[] }> = [
      { nodeId: sourceId, path: [sourceId] }
    ];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === targetId) {
        return path.map(id => this.nodes.get(id)!);
      }
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      const neighbors = this.adjacencyList.get(nodeId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push({
              nodeId: neighborId,
              path: [...path, neighborId]
            });
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate centrality of a node (importance in the graph)
   */
  calculateCentrality(nodeId: string): number {
    if (!this.nodes.has(nodeId)) return 0;
    
    // Degree centrality (normalized)
    const degree = this.adjacencyList.get(nodeId)?.size || 0;
    const maxDegree = Math.max(...Array.from(this.adjacencyList.values()).map(s => s.size));
    
    return maxDegree > 0 ? degree / maxDegree : 0;
  }

  /**
   * Get graph statistics
   */
  getStatistics(): {
    nodeCount: number;
    edgeCount: number;
    clusterCount: number;
    avgDegree: number;
    density: number;
    components: number;
  } {
    const degrees = Array.from(this.adjacencyList.values()).map(s => s.size);
    const avgDegree = degrees.length > 0 
      ? degrees.reduce((a, b) => a + b, 0) / degrees.length 
      : 0;

    const maxPossibleEdges = this.nodes.size * (this.nodes.size - 1) / 2;
    const density = maxPossibleEdges > 0 ? this.edges.size / maxPossibleEdges : 0;

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      clusterCount: this.clusters.size,
      avgDegree,
      density,
      components: this.countComponents()
    };
  }

  /**
   * Count connected components
   */
  private countComponents(): number {
    const visited = new Set<string>();
    let components = 0;
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        components++;
        this.dfsComponent(nodeId, visited);
      }
    }
    
    return components;
  }

  /**
   * DFS to mark all nodes in a component
   */
  private dfsComponent(nodeId: string, visited: Set<string>): void {
    visited.add(nodeId);
    const neighbors = this.adjacencyList.get(nodeId);
    
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          this.dfsComponent(neighborId, visited);
        }
      }
    }
  }

  /**
   * Save graph to disk
   */
  async save(): Promise<void> {
    const nodesData = Array.from(this.nodes.values()).map(n => this.serializeNode(n));
    const edgesData = Array.from(this.edges.values()).map(e => this.serializeEdge(e));
    const clustersData = Array.from(this.clusters.values()).map(c => this.serializeCluster(c));

    await fs.writeJson(path.join(this.graphPath, 'nodes.json'), nodesData, { spaces: 2 });
    await fs.writeJson(path.join(this.graphPath, 'edges.json'), edgesData, { spaces: 2 });
    await fs.writeJson(path.join(this.graphPath, 'clusters.json'), clustersData, { spaces: 2 });
  }

  /**
   * Rebuild adjacency list from edges
   */
  private rebuildAdjacencyList(): void {
    this.adjacencyList.clear();
    
    for (const node of this.nodes.keys()) {
      this.adjacencyList.set(node, new Set());
    }
    
    for (const edge of this.edges.values()) {
      this.adjacencyList.get(edge.source)?.add(edge.target);
      if (edge.bidirectional) {
        this.adjacencyList.get(edge.target)?.add(edge.source);
      }
    }
  }

  // Serialization helpers
  private serializeNode(node: GraphNode): any {
    return {
      ...node,
      properties: Array.from(node.properties.entries())
    };
  }

  private deserializeNode(data: any): GraphNode {
    return {
      ...data,
      properties: new Map(data.properties || []),
      lastAccessed: new Date(data.lastAccessed)
    };
  }

  private serializeEdge(edge: GraphEdge): any {
    return {
      ...edge,
      properties: Array.from(edge.properties.entries())
    };
  }

  private deserializeEdge(data: any): GraphEdge {
    return {
      ...data,
      properties: new Map(data.properties || [])
    };
  }

  private serializeCluster(cluster: GraphCluster): any {
    return {
      ...cluster,
      nodes: Array.from(cluster.nodes)
    };
  }

  private deserializeCluster(data: any): GraphCluster {
    return {
      ...data,
      nodes: new Set(data.nodes || [])
    };
  }
}

export default KnowledgeGraph;

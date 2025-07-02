class PostgresAPIFeatures {
  constructor(queryString) {
    this.queryString = queryString;
    this.sql = '';
    this.whereClauses = [];
    this.orderBy = '';
    this.fields = '*';
    this.limitClause = '';
    this.offsetClause = '';
    this.params = [];
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => delete queryObj[field]);

    let paramIndex = 1;

    for (let [key, value] of Object.entries(queryObj)) {
      if (typeof value === 'object') {
        // Advanced filters: e.g., ?price[gte]=1000
        for (let [op, val] of Object.entries(value)) {
          let sqlOp = '';
          if (op === 'gte') sqlOp = '>=';
          if (op === 'gt') sqlOp = '>';
          if (op === 'lte') sqlOp = '<=';
          if (op === 'lt') sqlOp = '<';

          if (sqlOp) {
            this.whereClauses.push(`${key} ${sqlOp} $${paramIndex}`);
            this.params.push(val);
            paramIndex++;
          }
        }
      } else {
        this.whereClauses.push(`${key} = $${paramIndex}`);
        this.params.push(value);
        paramIndex++;
      }
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortFields = this.queryString.sort
        .split(',')
        .map((field) => {
          return field.startsWith('-')
            ? `${field.slice(1)} DESC`
            : `${field} ASC`;
        })
        .join(', ');
      this.orderBy = `ORDER BY ${sortFields}`;
    } else {
      this.orderBy = `ORDER BY created_at DESC`;
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      this.fields = this.queryString.fields.split(',').join(', ');
    } else {
      this.fields = '*';
    }

    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 100;
    const offset = (page - 1) * limit;

    this.limitClause = `LIMIT ${limit}`;
    this.offsetClause = `OFFSET ${offset}`;

    return this;
  }

  build(tableName) {
    const where =
      this.whereClauses.length > 0
        ? `WHERE ${this.whereClauses.join(' AND ')}`
        : '';
    this.sql = `SELECT ${this.fields} FROM ${tableName} ${where} ${this.orderBy} ${this.limitClause} ${this.offsetClause}`;
    return { sql: this.sql, params: this.params };
  }
}

module.exports = PostgresAPIFeatures;

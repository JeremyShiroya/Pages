let g=null;const h=t=>String(t||"").replace(/\s+/g," ").trim(),y=t=>{const n=h(t).match(/\b(15|16|17|18|19|20)\d{2}\b/);return n?Number(n[0]):null},f=async(t,n)=>{if(!t)return[];const u=`
    query SearchBooks($query: String!) {
      books(where: { title: { _ilike: $query } }, limit: 6) {
        id
        title
        description
        release_date
        rating
        image {
          url
        }
        contributions {
          author {
            name
          }
        }
        book_series {
          position
          series {
            name
            books_count
          }
        }
        cached_tags
      }
    }
  `;try{const m=`%${t.trim()}%`,i=await fetch("https://api.hardcover.app/v1/graphql",{method:"POST",headers:{"Content-Type":"application/json","User-Agent":"Bookish/1.2 (+https://github.com/JeremyShiroya/Bookish)"},body:JSON.stringify({query:u,variables:{query:m}})});return i.ok?((await i.json()).data?.books||[]).map(e=>{const p=e.contributions?.map(d=>d.author?.name).filter(Boolean).join(", ")||null,o=e.book_series?.[0],l=o?.series?.name||null,r=o?.position?String(o.position):null,c=o?.series?.books_count?String(o.series.books_count):null,s=e.rating?`⭐ ${Number(e.rating).toFixed(1)}/5`:null,b=Array.isArray(e.cached_tags)?e.cached_tags.slice(0,3).join(", "):null;return{id:`hardcover:${e.id}`,source:"hardcover",title:h(e.title),author:p,cover:e.image?.url||null,blurb:h(e.description)||null,series:l,seriesInstallment:r,seriesTotal:c,genre:b,publishYear:y(e.release_date),publisher:null,webReview:s}}).filter(e=>e.title):[]}catch{return[]}},S=async(t,n)=>{const u=t||n;if(!u)return{series:null,total:null,books:[]};const m=`
    query GetSeriesRoster($query: String!) {
      series(where: { name: { _ilike: $query } }, limit: 1) {
        name
        books_count
        book_series(order_by: { position: asc }) {
          position
          book {
            title
            release_date
            image {
              url
            }
            contributions {
              author {
                name
              }
            }
          }
        }
      }
    }
  `;try{const i=await fetch("https://api.hardcover.app/v1/graphql",{method:"POST",headers:{"Content-Type":"application/json","User-Agent":"Bookish/1.2 (+https://github.com/JeremyShiroya/Bookish)"},body:JSON.stringify({query:m,variables:{query:`%${u.trim()}%`}})});if(!i.ok)return{series:null,total:null,books:[]};const a=(await i.json()).data?.series?.[0];if(!a)return{series:null,total:null,books:[]};const e=a.name||t,p=Number(a.books_count)||null,l=(a.book_series||[]).map(r=>{const c=Number(r.position);if(!Number.isSafeInteger(c)||c<1)return null;const s=r.book;if(!s?.title)return null;const b=s.contributions?.map(d=>d.author?.name).filter(Boolean).join(", ")||null;return{installment:c,title:h(s.title),author:b,cover:s.image?.url||null,year:y(s.release_date)}}).filter(r=>r!==null);return{series:e,total:p||(l.length?Math.max(...l.map(r=>r.installment)):null),books:l}}catch{return{series:null,total:null,books:[]}}};export{S as fetchHardcoverSeriesRoster,f as searchHardcover};

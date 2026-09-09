"""Local-only integration checks. Run from the project root while npm run dev is running.
The Sites local test persona is temporarily assigned roles in the local D1 fixture,
and restored in finally. This never uses production identity or production data.
"""
import json,urllib.request,urllib.error,http.cookiejar,sqlite3,pathlib,uuid,datetime
BASE='http://localhost:3000'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
count=0
def request(path,body=None,auth=True,extra=None):
 headers={'Content-Type':'application/json','Origin':BASE,**(extra or {})}
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with (client if auth else urllib.request.build_opener()).open(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def check(ok,label):
 global count
 assert ok,label
 count+=1;print('PASS',label)
check(request('/api/banking',auth=False)[0]==401,'anonymous banking data denied')
check(request('/api/users',auth=False)[0]==401,'anonymous user list denied')
check(request('/api/banking',auth=False,extra={'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test','X-Demo-Role':'Administrator'})[0]==401,'spoofed identity headers stripped by local Sites gateway')
client.open(BASE+'/signin-with-chatgpt?return_to=%2F').close()
code,data=request('/api/banking');check(code==200 and data['currentUser']['role']=='Administrator','signed-in administrator admitted')
admin=data['currentUser'];tenant='sampoerna-corporate-v2'
fixture=None
for f in pathlib.Path('.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'):
 db=sqlite3.connect(f)
 try:
  row=db.execute('SELECT user_id FROM members WHERE id=?',(admin['id'],)).fetchone()
  if row and row[0]=='local_seedy':fixture=db;break
 except sqlite3.OperationalError:pass
 db.close()
assert fixture is not None,'Local Seedy fixture required'
original=fixture.execute('SELECT role,status,name FROM members WHERE id=?',(admin['id'],)).fetchone()
def fixture_role(role,status='Active'):
 fixture.execute('UPDATE members SET role=?,status=? WHERE id=?',(role,status,admin['id']));fixture.commit()
try:
 uid=str(uuid.uuid4())[:8];email='integration-'+uid+'@example.test'
 code,result=request('/api/users',{'action':'create','email':email,'name':'Integration User','role':'Maker'})
 check(code==201,'user created and stored');user_id=result['id']
 users=request('/api/users')[1]['users'];u=next(x for x in users if x['id']==user_id)
 check(not u['activated'] and u['status']=='Active','new user awaits signed-in identity binding')
 check(request('/api/users',{'action':'create','email':email.upper(),'name':'Duplicate','role':'Maker'})[0]==409,'case-normalized duplicate email rejected')
 check(request('/api/users',{'action':'update','id':admin['id'],'revision':admin['revision'],'name':admin['name'],'role':'Maker','status':'Active'})[0]==400,'self-demotion blocked')
 check(request('/api/users',{'action':'update','id':admin['id'],'revision':admin['revision'],'name':admin['name'],'role':'Administrator','status':'Suspended'})[0]==400,'self-suspension blocked')
 update={'action':'update','id':user_id,'revision':u['revision'],'name':'Integration User','role':'Approver','status':'Suspended'}
 check(request('/api/users',update)[0]==200,'role and suspension saved')
 check(request('/api/users',update)[0]==409,'stale user update rejected')
 u=next(x for x in request('/api/users')[1]['users'] if x['id']==user_id)
 check(u['status']=='Suspended' and u['role']=='Approver','user changes survive reload')
 check(request('/api/users',{**update,'revision':u['revision'],'status':'Active'})[0]==200,'reactivation saved')
 check(request('/api/banking',{'action':'account','account':{'name':'Integration Account','number':'DEMO-'+uid,'currency':'IDR','type':'Current','balance':'2500000'}})[0]==200,'administrator creates saved demo account')
 operating=next(a for a in data['accounts'] if a['name']=='Operating account')
 payment={'account_id':operating['id'],'beneficiary':'Integration Supplier','bank':'Bank Sampoerna','number':'9001023991','amount':'1000000','rail':'BI-FAST','reference':'AUTH-TEST-'+uid,'date':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=7)).date().isoformat()}
 check(request('/api/banking',{'action':'payment','payment':payment},extra={'X-Demo-Role':'Maker'})[0]==403,'client cannot change administrator into maker')
 fixture_role('Maker')
 check(request('/api/users')[0]==403,'maker cannot list users')
 check(request('/api/users',{'action':'create','email':'blocked-'+email,'name':'Denied','role':'Administrator'},extra={'X-Demo-Role':'Administrator'})[0]==403,'maker cannot grant administrator access')
 code,result=request('/api/banking',{'action':'payment','payment':payment});check(code==200,'maker payment stored');pid=result['ids'][0]
 check(request('/api/banking',{'action':'approve','id':pid},extra={'X-Demo-Role':'Approver'})[0]==403,'maker cannot spoof approver role')
 fixture_role('Approver')
 check(request('/api/banking',{'action':'approve','id':pid})[0]==400,'self-approval blocked after role changes')
 fixture.execute('UPDATE payments SET maker=? WHERE id=?',('independent-local-fixture',pid));fixture.commit()
 d=request('/api/banking')[1];pending=next(p for p in d['payments'] if p['id']==pid);a=next(a for a in d['accounts'] if a['id']==pending['account_id'])
 check(request('/api/banking',{'action':'approve','id':pending['id']})[0]==200,'different approver completes seeded instruction')
 check(request('/api/banking',{'action':'approve','id':pending['id']})[0]==409,'repeat approval rejected')
 d=request('/api/banking')[1];check(next(x['balance'] for x in d['accounts'] if x['id']==a['id'])==a['balance']-pending['amount'],'approval debits once')
 fixture_role('Approver','Suspended')
 check(request('/api/banking')[0]==403,'suspension blocks existing signed-in session')
 check(request('/api/banking',{'action':'payment','payment':payment})[0]==403,'suspended session cannot write')
 fixture_role('Administrator')
 d=request('/api/banking')[1];check(any(x['action']=='User access updated' and email in x['detail'] for x in d['audit']),'administration changes audited')
 check(request('/api/users',{'action':'create','email':'invalid','name':'Test','role':'Maker'})[0]==400,'invalid email rejected')
 check(request('/api/banking',{'action':'record','kind':'service','data':{'name':'Auth test '+uid,'service':'Escrow','notes':'Persisted draft'}})[0]==200,'business input remains database-backed')
finally:
 fixture.execute('UPDATE members SET role=?,status=?,name=? WHERE id=?',(*original,admin['id']));fixture.commit();fixture.close()
print(f'{count} backend integration checks passed.')

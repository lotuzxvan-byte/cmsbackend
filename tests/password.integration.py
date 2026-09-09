"""Local password/session checks. Run from the repository with its dev server running."""
import json,urllib.request,urllib.error,pathlib,sqlite3,secrets
BASE='http://localhost:3000'
class Client:
 def __init__(self):self.cookie='';self.flags=''
 def req(self,path,body=None,origin=BASE):
  h={'Origin':origin,'Content-Type':'application/json','Cookie':self.cookie}
  try:r=urllib.request.urlopen(urllib.request.Request(BASE+path,headers=h,data=None if body is None else json.dumps(body).encode()))
  except urllib.error.HTTPError as e:r=e
  except ConnectionResetError:
   if origin!=BASE:return 403,{}
   raise
  if r.headers.get('Set-Cookie'):self.flags=r.headers['Set-Cookie'];self.cookie=self.flags.split(';')[0]
  raw=r.read()
  try:d=json.loads(raw)
  except:d=raw.decode()
  return r.status,d
count=0
def check(ok,label):
 global count
 assert ok,label
 count+=1;print('PASS',label)
def pw():return 'Test-'+secrets.token_urlsafe(24)
setup=json.loads(pathlib.Path('../local-password.json').read_text())
db=None
for f in pathlib.Path('.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'):
 c=sqlite3.connect(f)
 try:
  if c.execute("SELECT id FROM members WHERE email='seedy@sites.test'").fetchone():db=c;break
 except sqlite3.OperationalError:pass
 c.close()
assert db
adminid=db.execute("SELECT id FROM members WHERE email='seedy@sites.test'").fetchone()[0]
db.execute('DELETE FROM auth_sessions');db.execute('DELETE FROM auth_credentials WHERE member_id=?',(adminid,));db.execute('DELETE FROM auth_limits');db.commit()
a=Client();n=Client()
check(n.req('/api/banking')[0]==401,'anonymous denial')
check('Sign in to your workspace' in n.req('/')[1],'password login renders')
check(n.req('/api/auth/login',setup,origin='https://evil.example')[0]==403,'cross-origin login denied')
check(n.req('/api/auth/login',{'email':setup['email'],'password':'wrong'})[0]==401,'wrong password denied')
s,d=a.req('/api/auth/login',setup);check(s==200 and d['mustChange'],'bootstrap accepted')
check(all(x in a.flags for x in ['HttpOnly','Secure','SameSite=Strict','Path=/']),'restricted session cookie')
check(a.req('/api/banking')[0]==403,'temporary password blocks banking')
check(a.req('/api/users')[0]==403,'temporary password blocks administration')
check(a.req('/api/auth/password',{'currentPassword':setup['password'],'password':'short'})[0]==400,'weak password denied')
new=pw();old=a.cookie
check(a.req('/api/auth/password',{'currentPassword':setup['password'],'password':new})[0]==200,'first password change')
z=Client();z.cookie=old;check(z.req('/api/banking')[0]==401,'old session revoked')
check(a.req('/api/banking')[0]==200,'banking unlocked')
check(n.req('/api/auth/login',setup)[0]==401,'bootstrap cannot be reused')
email='auth-'+secrets.token_hex(4)+'@example.test';temp=pw();body={'action':'create','name':'Auth test','email':email,'role':'Maker','password':temp}
check(a.req('/api/users',{**body,'password':'short'})[0]==400,'weak initial password denied')
s,d=a.req('/api/users',body);check(s==201,'user created');uid=d['id']
m=Client();check(m.req('/api/auth/login',{'email':email,'password':temp})[1]['mustChange'],'new user forced change')
mp=pw();check(m.req('/api/auth/password',{'currentPassword':temp,'password':mp})[0]==200,'maker changes password')
check(m.req('/api/users')[0]==403,'maker user list denied')
check(m.req('/api/banking')[0]==200,'maker banking access')
reset=pw();body={'action':'reset-password','id':uid,'password':reset}
check(m.req('/api/users',body)[0]==403,'maker reset denied')
check(a.req('/api/users',{**body,'id':adminid})[0]==400,'self reset denied')
check(a.req('/api/users',body)[0]==200,'admin reset succeeds')
check(m.req('/api/banking')[0]==401,'reset invalidates sessions')
check(m.req('/api/auth/login',{'email':email,'password':mp})[0]==401,'old password rejected')
check(m.req('/api/auth/login',{'email':email,'password':reset})[1]['mustChange'],'reset forces change')
mp2=pw();m.req('/api/auth/password',{'currentPassword':reset,'password':mp2})
u=next(x for x in a.req('/api/users')[1]['users'] if x['id']==uid)
check(a.req('/api/users',{'action':'update','id':uid,'name':u['name'],'role':u['role'],'status':'Suspended','revision':u['revision']})[0]==200,'suspend user')
check(m.req('/api/banking')[0]==401,'suspension blocks sessions')
check(m.req('/api/auth/login',{'email':email,'password':mp2})[0]==401,'suspended login denied')
old=a.cookie;check(a.req('/api/auth/logout',{})[0]==200,'logout succeeds')
check(a.req('/api/banking')[0]==401,'logout denied subsequent access')
z.cookie=old;check(z.req('/api/banking')[0]==401,'logout replay denied')
check(a.req('/api/auth/login',{'email':setup['email'],'password':new})[0]==200,'normal login')
db.execute('UPDATE auth_sessions SET expires=0 WHERE member_id=?',(adminid,));db.commit()
check(a.req('/api/banking')[0]==401,'expired session denied')
for i in range(10):n.req('/api/auth/login',{'email':'rate-test@example.test','password':'wrong'})
check(n.req('/api/auth/login',{'email':'rate-test@example.test','password':'wrong'})[0]==429,'throttling enforced')
h=db.execute('SELECT password_hash FROM auth_credentials WHERE member_id=?',(uid,)).fetchone()[0]
check(mp2 not in h and h.startswith('pbkdf2-sha256:100000:'),'salted hashes stored')
print('Passed',count,'checks')

import { sortScores, calculateSeats } from './map'
import { etlPartylistData } from './partylist'
import { CDN_IMGURL } from '../constants'
import { calculateTotalVotes } from '../util'

import tempParties from '../masterData/idToPartyMap.json'
import tempPartylist from '../masterData/partyToPartylistMembersMap.json'
import tempProvinces from '../masterData/idToProvinceMap.json'
import tempConstituency from '../masterData/uniqueKeyToConstituencyMemberMap.json'
import { newMapper } from '../mapper/IMapper'

const partyData: any = tempParties
const provinceData: any = tempProvinces
const partylistData: any = tempPartylist
const constituencyData: any = tempConstituency

export async function etlOverallData() {
    const mapper = newMapper()
    const scores = await mapper.scores()
    const partySeats = calculateSeats(sortScores(scores))

    const partylistMap = await etlPartylistData().then(list =>
        listToMap(list, 'partyName')
    )

    return partySeats
        .map(seats => {
            const { codeEN, name, colorCode } = partyData[`${seats[0].partyId}`]
            const partylist = partylistMap[name]
            const constituencyCandidates = seats.map(seat => {
                const { title, firstName, lastName, zone, provinceId } = seat
                const { code, name: provinceName } = provinceData[
                    `${provinceId}`
                ]
                const constituency =
                    constituencyData[`${provinceName}:${zone}:${name}`]
                const imgName: string = constituency
                    ? `${constituency.guid}.jpg`
                    : 'placeholder.png'

                return {
                    candidate: `${title} ${firstName} ${lastName}`,
                    picture: `${CDN_IMGURL}/candidates/${imgName.toLowerCase()}`,
                    zone: `${code}:${zone}`,
                }
            })

            const constituencySeats = constituencyCandidates.length
            const partylistSeats = partylist ? partylist.seats : 0
            const partylistCandidates = (partylistSeats
                ? partylistData[name].candidates.slice(0, partylistSeats)
                : []
            ).map((c: any) => {
                const { title, firstName, lastName, id } = c

                return {
                    candidate: `${title} ${firstName} ${lastName}`,
                    picture: `${CDN_IMGURL}/partylist/${id.toLowerCase()}.jpg`,
                }
            })

            return {
                partyCode: codeEN,
                partyName: name,
                color: `#${colorCode}`,
                picture: `${CDN_IMGURL}/parties/${name}.png`,
                seats: partylistSeats + constituencySeats,
                partylistSeats,
                constituencySeats,
                constituencyCandidates,
                partylistCandidates,
            }
        })
        .sort((a, b) => b.seats - a.seats)
}

function listToMap(list: any[], key: string) {
    return list.reduce(
        (map, elem) => {
            map[elem[key]] = elem
            return map
        },
        {} as any
    )
}

export async function roughlyEstimateOverall() {
    const mapper = newMapper()
    const scores = await mapper.scores()
    const partySeats = calculateSeats(sortScores(scores))
    const totalVotes = await calculateTotalVotes()

    return partySeats
        .map(seats => {
            const { codeEN, name, colorCode } = partyData[`${seats[0].partyId}`]
            const votes = seats.reduce((sum, seat) => sum + seat.score, 0)

            return {
                partyCode: codeEN,
                partyName: name,
                color: `#${colorCode}`,
                picture: `${CDN_IMGURL}/parties/${name}.png`,
                seats: Math.floor(votes / (totalVotes / 500)),
                partylistSeats: 0,
                constituencySeats: 0,
                constituencyCandidates: [],
            }
        })
        .sort((a, b) => b.seats - a.seats)
}
